import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Appointment, Appointments } from '../../core/services/appointments';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-doctor-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-dashboard.html',
  styleUrl: './doctor-dashboard.css',
})
export class DoctorDashboard {
  appointments: Appointment[] = [];
  noteDrafts: Record<string, string> = {};
  private subscription?: Subscription;

  constructor(
    private readonly authService: Auth,
    private readonly appointmentsService: Appointments,
    private readonly router: Router,
  ) {
    const doctorId = this.authService.getCurrentUserId();
    if (!doctorId) {
      this.router.navigateByUrl('/');
      return;
    }

    this.subscription = this.appointmentsService.watchByDoctor(doctorId).subscribe((items) => {
      this.appointments = items;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async saveNote(appointmentId: string): Promise<void> {
    const note = this.noteDrafts[appointmentId] ?? '';
    await this.appointmentsService.addDoctorNote(appointmentId, note);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/');
  }
}
