import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Appointment, appointmentBlocksSchedule, displayAppointmentStatus } from '../../interfaces/appointment';
import { User } from '../../interfaces/user';
import { Auth } from '../../services/auth';
import { DoctorAvailability } from '../../services/doctor-availability';
import { Firestore } from '../../services/firestore';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { Sidebar } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, HealthcareShell, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  doctors: User[] = [];
  patients: User[] = [];
  appointments: Appointment[] = [];
  loginHistoryCount = 0;
  busyDoctorsCount = 0;
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly firestoreService: Firestore,
    private readonly authService: Auth,
    private readonly router: Router,
    private readonly availability: DoctorAvailability,
  ) {
    this.subscriptions.push(
      this.firestoreService.watchUsers('doctor').subscribe((items) => (this.doctors = items)),
      this.firestoreService.watchUsers('patient').subscribe((items) => (this.patients = items)),
      this.firestoreService.watchAppointments().subscribe((items) => {
        this.appointments = items;
        this.busyDoctorsCount = this.countBusyDoctorsNow(items);
      }),
      this.firestoreService.watchLoginHistoryCountLive().subscribe((count) => (this.loginHistoryCount = count)),
    );
  }

  private n(item: Appointment): ReturnType<typeof displayAppointmentStatus> {
    return displayAppointmentStatus(String(item.status));
  }

  get waitingAdminCount(): number {
    return this.appointments.filter((item) => this.n(item) === 'waiting_admin_approval').length;
  }

  get adminApprovedCount(): number {
    return this.appointments.filter((item) => this.n(item) === 'admin_approved').length;
  }

  get patientPendingCount(): number {
    return this.appointments.filter((item) => this.n(item) === 'pending').length;
  }

  private countBusyDoctorsNow(items: Appointment[]): number {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const busy = new Set<string>();
    for (const item of items) {
      if (!appointmentBlocksSchedule(String(item.status))) {
        continue;
      }
      if (item.appointmentDate !== today) {
        continue;
      }
      const start = this.availability.parseMinutes(item.appointmentTime);
      const end = start + 60;
      if (nowMinutes >= start && nowMinutes < end) {
        busy.add(item.doctorId);
      }
    }
    return busy.size;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((item) => item.unsubscribe());
  }
}
