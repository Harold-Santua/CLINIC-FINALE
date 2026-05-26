import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  Appointment,
  AppointmentStatus,
  displayAppointmentStatus,
} from '../../interfaces/appointment';
import { Doctor } from '../../interfaces/doctor';
import { DoctorAvailability, DoctorAvailabilityRow } from '../../services/doctor-availability';
import { Firestore } from '../../services/firestore';
import { AppointmentStatusLabelPipe } from '../../pipes/appointment-status-label-pipe';
import { AdminAppointmentActions } from '../../shared/admin-appointment-actions/admin-appointment-actions';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { Sidebar } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-appointments',
  imports: [
    CommonModule,
    FormsModule,
    HealthcareShell,
    Sidebar,
    AppointmentStatusLabelPipe,
    AdminAppointmentActions,
  ],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnDestroy {
  appointments: Appointment[] = [];
  doctors: Doctor[] = [];
  doctorAvailabilityRows: DoctorAvailabilityRow[] = [];

  filterDoctorId = '';
  filterDate = '';
  filterStatus = '';
  filterTime = '';
  filterAvailability: 'all' | 'available' | 'unavailable' | 'in_active_block' = 'all';

  readonly statusOptions: AppointmentStatus[] = [
    'pending',
    'doctor_approved',
    'waiting_admin_approval',
    'admin_approved',
    'doctor_rejected',
    'admin_rejected',
    'cancelled',
  ];

  private subscriptions: Subscription[] = [];
  private availabilitySub?: Subscription;

  constructor(
    private readonly firestoreService: Firestore,
    private readonly availability: DoctorAvailability,
  ) {
    const today = new Date();
    this.filterDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    this.subscriptions.push(
      this.firestoreService.watchAppointments().subscribe((items) => (this.appointments = items)),
      this.firestoreService.watchDoctors().subscribe((items) => {
        this.doctors = items;
        this.refreshAvailability();
      }),
    );
  }

  onFilterDateChange(): void {
    this.refreshAvailability();
  }

  private refreshAvailability(): void {
    this.availabilitySub?.unsubscribe();
    if (!this.doctors.length || !this.filterDate) {
      this.doctorAvailabilityRows = [];
      return;
    }
    this.availabilitySub = this.availability
      .watchAvailabilityForDate(this.doctors, this.filterDate)
      .subscribe((rows) => (this.doctorAvailabilityRows = rows));
  }

  get doctorOptions(): { id: string; name: string }[] {
    return this.doctors.map((d) => ({ id: d.id, name: d.doctorName }));
  }

  private n(item: Appointment): Appointment['status'] {
    return displayAppointmentStatus(String(item.status));
  }

  get waitingAdminQueue(): Appointment[] {
    return this.filteredAppointments.filter((item) => this.n(item) === 'waiting_admin_approval');
  }

  get filteredAppointments(): Appointment[] {
    let items = [...this.appointments];

    if (this.filterDoctorId) {
      items = items.filter((item) => item.doctorId === this.filterDoctorId);
    }
    if (this.filterDate) {
      items = items.filter((item) => item.appointmentDate === this.filterDate);
    }
    if (this.filterStatus) {
      items = items.filter((item) => this.n(item) === this.filterStatus);
    }
    if (this.filterTime) {
      items = items.filter((item) => item.appointmentTime.startsWith(this.filterTime));
    }
    if (this.filterAvailability !== 'all') {
      items = this.availability.filterAppointmentsByAvailability(
        items,
        this.filterAvailability,
        this.doctors,
        this.filterDate,
      );
    }

    return items;
  }

  clearFilters(): void {
    this.filterDoctorId = '';
    this.filterStatus = '';
    this.filterTime = '';
    this.filterAvailability = 'all';
    const today = new Date();
    this.filterDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.refreshAvailability();
  }

  ngOnDestroy(): void {
    this.availabilitySub?.unsubscribe();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
