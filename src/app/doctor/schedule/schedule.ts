import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Appointment, displayAppointmentStatus } from '../../interfaces/appointment';
import { DoctorAppointments } from '../../services/doctor-appointments';
import { AppointmentStatusLabelPipe } from '../../pipes/appointment-status-label-pipe';
import { DoctorAppointmentActions } from '../../shared/doctor-appointment-actions/doctor-appointment-actions';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { Sidebar } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-schedule',
  imports: [CommonModule, HealthcareShell, Sidebar, AppointmentStatusLabelPipe, DoctorAppointmentActions],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  schedule: Appointment[] = [];
  appointmentsStreamError: string | null = null;
  private subscription?: Subscription;

  constructor(private readonly doctorAppointments: DoctorAppointments) {
    this.subscription = this.doctorAppointments.watchMyAppointments().subscribe((state) => {
      this.schedule = state.appointments;
      this.appointmentsStreamError = state.streamError;
    });
  }

  private n(item: Appointment): Appointment['status'] {
    return displayAppointmentStatus(String(item.status));
  }

  get pendingSchedule(): Appointment[] {
    return this.schedule.filter((item) => this.n(item) === 'pending');
  }

  get doctorApprovedSchedule(): Appointment[] {
    return this.schedule.filter((item) => this.n(item) === 'doctor_approved');
  }

  get waitingAdminSchedule(): Appointment[] {
    return this.schedule.filter((item) => this.n(item) === 'waiting_admin_approval');
  }

  get finalApprovedSchedule(): Appointment[] {
    return this.schedule.filter((item) => this.n(item) === 'admin_approved');
  }

  get rejectedSchedule(): Appointment[] {
    return this.schedule.filter((item) => {
      const s = this.n(item);
      return s === 'cancelled' || s === 'doctor_rejected' || s === 'admin_rejected';
    });
  }

  statusClass(status: string): string {
    const s = displayAppointmentStatus(String(status));
    if (s === 'admin_approved') {
      return 'status-approved';
    }
    if (s === 'doctor_approved' || s === 'waiting_admin_approval') {
      return 'status-waiting';
    }
    if (s === 'doctor_rejected' || s === 'admin_rejected' || s === 'cancelled') {
      return 'status-cancelled';
    }
    if (s === 'pending') {
      return 'status-pending';
    }
    return 'status-default';
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
