import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Doctor } from '../../interfaces/doctor';
import { Appointment as AppointmentService } from '../../services/appointment';
import { Auth } from '../../services/auth';
import { DoctorAvailability } from '../../services/doctor-availability';
import { Firestore } from '../../services/firestore';
import { blockEndTime } from '../../services/appointment-schedule.util';
import { ToastState } from '../toast-state';

@Component({
  selector: 'app-appointment-booking-dialog',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-booking-dialog.html',
  styleUrl: './appointment-booking-dialog.css',
})
export class AppointmentBookingDialog implements OnChanges, OnDestroy {
  @Input() doctor: Doctor | null = null;
  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();
  @Output() booked = new EventEmitter<void>();

  form: ReturnType<FormBuilder['group']>;
  readonly minDate: string;
  blockedSlots: { appointmentTime?: string; status?: string }[] = [];
  slotConflictMessage = '';

  private slotsSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly appointmentService: AppointmentService,
    private readonly authService: Auth,
    private readonly firestore: Firestore,
    private readonly availability: DoctorAvailability,
    private readonly toast: ToastState,
  ) {
    this.minDate = this.todayIsoDate();
    this.form = this.fb.group({
      appointmentDate: ['', [Validators.required]],
      appointmentTime: ['', [Validators.required]],
      symptoms: ['', [Validators.required, Validators.minLength(3)]],
    });
    this.form.controls['appointmentDate'].valueChanges.subscribe((date) => this.watchSlots(date));
    this.form.controls['appointmentTime'].valueChanges.subscribe(() => this.checkConflict());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue && this.doctor) {
      const date = this.form.controls['appointmentDate'].value as string | null;
      if (date) {
        this.watchSlots(date);
      }
    }
  }

  close(): void {
    this.openChange.emit(false);
    this.form.reset();
    this.blockedSlots = [];
    this.slotConflictMessage = '';
    this.slotsSub?.unsubscribe();
  }

  async submit(): Promise<void> {
    if (!this.doctor) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Please complete date, time, and symptoms.', 'error');
      return;
    }
    if (this.slotConflictMessage) {
      this.toast.show(this.slotConflictMessage, 'error');
      return;
    }
    const profile = this.authService.currentProfile;
    if (!profile) {
      this.toast.show('You must be signed in to book.', 'error');
      return;
    }
    const { appointmentDate, appointmentTime, symptoms } = this.form.getRawValue();
    try {
      await this.appointmentService.createAppointment({
        patientId: profile.uid,
        doctorId: this.doctor.id,
        patientName: profile.fullName,
        doctorName: this.doctor.doctorName,
        appointmentDate: appointmentDate!,
        appointmentTime: appointmentTime!,
        symptoms: symptoms!,
      });
      this.toast.show('Appointment request sent. Track status on Home.', 'success');
      this.form.reset();
      this.booked.emit();
      this.openChange.emit(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking failed.';
      if (message.includes('Slot unavailable') || message.includes('unavailable from')) {
        this.toast.show(message, 'error');
        return;
      }
      this.toast.show(message, 'error');
    }
  }

  get blockedTimesLabel(): string {
    if (!this.blockedSlots.length) {
      return '';
    }
    return this.blockedSlots
      .map((s) => {
        const t = String(s.appointmentTime ?? '');
        return t ? `${t}–${blockEndTime(t)}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }

  private watchSlots(date: string | null): void {
    this.slotsSub?.unsubscribe();
    this.blockedSlots = [];
    this.slotConflictMessage = '';
    if (!this.doctor?.id || !date) {
      return;
    }
    this.slotsSub = this.firestore.watchDoctorSlotsForDate(this.doctor.id, date).subscribe((slots) => {
      this.blockedSlots = slots;
      this.checkConflict();
    });
  }

  private checkConflict(): void {
    const time = this.form.controls['appointmentTime'].value;
    if (!time) {
      this.slotConflictMessage = '';
      return;
    }
    if (this.availability.isSlotBlocked(this.blockedSlots, time)) {
      this.slotConflictMessage = `This doctor is unavailable during that hour. Blocked: ${this.blockedTimesLabel || 'another appointment'}.`;
      return;
    }
    this.slotConflictMessage = '';
  }

  private todayIsoDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  ngOnDestroy(): void {
    this.slotsSub?.unsubscribe();
  }
}
