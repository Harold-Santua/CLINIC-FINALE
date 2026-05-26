import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Appointment, displayAppointmentStatus } from '../../interfaces/appointment';
import { Appointment as AppointmentService } from '../../services/appointment';
import { ToastState } from '../toast-state';

@Component({
  selector: 'app-doctor-appointment-actions',
  imports: [CommonModule],
  templateUrl: './doctor-appointment-actions.html',
  styleUrl: './doctor-appointment-actions.css',
})
export class DoctorAppointmentActions {
  @Input({ required: true }) item!: Appointment;

  constructor(
    private readonly appointments: AppointmentService,
    private readonly toast: ToastState,
  ) {}

  private status(): Appointment['status'] {
    return displayAppointmentStatus(String(this.item.status));
  }

  get showApprove(): boolean {
    return this.status() === 'pending';
  }

  get showSendToAdmin(): boolean {
    return this.status() === 'doctor_approved';
  }

  get showReject(): boolean {
    const s = this.status();
    return s === 'pending' || s === 'doctor_approved' || s === 'waiting_admin_approval';
  }

  private err(e: unknown): void {
    const m = e instanceof Error ? e.message : 'Action failed.';
    this.toast.show(m, 'error');
  }

  async approve(): Promise<void> {
    try {
      await this.appointments.doctorApprove(this.item.id);
      this.toast.show('Appointment approved. Send to admin when ready.', 'success');
    } catch (e) {
      this.err(e);
    }
  }

  async sendToAdmin(): Promise<void> {
    try {
      await this.appointments.doctorSendToAdmin(this.item.id);
      this.toast.show('Sent to admin for final approval.', 'success');
    } catch (e) {
      this.err(e);
    }
  }

  async reject(): Promise<void> {
    try {
      await this.appointments.doctorReject(this.item.id);
      this.toast.show('Appointment rejected.', 'info');
    } catch (e) {
      this.err(e);
    }
  }
}
