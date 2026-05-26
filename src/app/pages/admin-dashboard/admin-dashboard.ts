import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Appointment, Appointments, AppointmentStatus } from '../../core/services/appointments';
import { Auth, UserProfile } from '../../core/services/auth';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  doctors: UserProfile[] = [];
  patients: UserProfile[] = [];
  appointments: Appointment[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly authService: Auth,
    private readonly appointmentsService: Appointments,
    private readonly router: Router,
  ) {
    this.subscriptions.push(
      this.authService.watchUsersByRole('doctor').subscribe((entries) => (this.doctors = entries)),
      this.authService.watchUsersByRole('patient').subscribe((entries) => (this.patients = entries)),
      this.appointmentsService.watchAll().subscribe((entries) => (this.appointments = entries)),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  async updateStatus(appointmentId: string, status: AppointmentStatus): Promise<void> {
    await this.appointmentsService.setStatus(appointmentId, status);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/');
  }
}
