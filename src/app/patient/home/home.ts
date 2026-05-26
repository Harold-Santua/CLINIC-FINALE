import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Appointment, displayAppointmentStatus } from '../../interfaces/appointment';
import { Appointment as AppointmentService } from '../../services/appointment';
import { Auth } from '../../services/auth';
import { Firestore } from '../../services/firestore';
import { AppointmentStatusLabelPipe } from '../../pipes/appointment-status-label-pipe';
import { PatientNavbar } from '../../shared/patient-navbar/patient-navbar';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, PatientNavbar, AppointmentStatusLabelPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  appointments: Appointment[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly firestoreService: Firestore,
    private readonly appointmentService: AppointmentService,
    private readonly authService: Auth,
    private readonly toast: ToastState,
  ) {
    this.subscriptions.push(
      this.authService
        .watchProfile()
        .pipe(
          switchMap((profile) => {
            if (!profile?.uid) {
              return of<Appointment[]>([]);
            }
            return this.firestoreService.watchAppointmentsByPatient(profile.uid);
          }),
        )
        .subscribe((items) => (this.appointments = items)),
    );
  }

  canWithdraw(item: Appointment): boolean {
    return displayAppointmentStatus(String(item.status)) === 'pending';
  }

  isAdminRejected(item: Appointment): boolean {
    return displayAppointmentStatus(String(item.status)) === 'admin_rejected';
  }

  async cancel(id: string): Promise<void> {
    try {
      await this.appointmentService.patientWithdraw(id);
      this.toast.show('Request withdrawn.', 'info');
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not withdraw.';
      this.toast.show(m, 'error');
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
