import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Appointments, Appointment } from '../../core/services/appointments';
import { Auth, UserProfile } from '../../core/services/auth';

@Component({
  selector: 'app-patient-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-dashboard.html',
  styleUrl: './patient-dashboard.css',
})
export class PatientDashboard {
  appointmentDate = '';
  appointmentTime = '';
  selectedDoctorId = '';
  doctors: UserProfile[] = [];
  appointments: Appointment[] = [];
  warning = '';
  message = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly authService: Auth,
    private readonly appointmentsService: Appointments,
    private readonly router: Router,
  ) {
    const patientId = this.authService.getCurrentUserId();
    if (!patientId) {
      this.router.navigateByUrl('/');
      return;
    }

    this.subscriptions.push(
      this.authService.watchUsersByRole('doctor').subscribe((doctors) => (this.doctors = doctors)),
      this.appointmentsService.watchByPatient(patientId).subscribe((items) => (this.appointments = items)),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  async book(): Promise<void> {
    this.warning = '';
    this.message = '';
    if (!this.appointmentDate || !this.appointmentTime || !this.selectedDoctorId) {
      this.warning = 'Please select date, time, and doctor.';
      return;
    }

    const patientId = this.authService.getCurrentUserId();
    const patientName = this.authService.currentUser?.email?.split('@')[0] ?? 'Patient';
    if (!patientId) {
      this.warning = 'Session expired. Please log in again.';
      return;
    }

    const chosenDoctor = this.doctors.find((doctor) => doctor.uid === this.selectedDoctorId);
    if (!chosenDoctor) {
      this.warning = 'Selected doctor is unavailable.';
      return;
    }

    await this.appointmentsService.create({
      patientId,
      patientName,
      doctorId: chosenDoctor.uid,
      doctorName: chosenDoctor.displayName || chosenDoctor.email,
      date: this.appointmentDate,
      time: this.appointmentTime,
    });

    this.message = 'Appointment request submitted and now visible in your dashboard.';
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/');
  }
}
