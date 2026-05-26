import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Doctor } from '../../interfaces/doctor';
import { Firestore } from '../../services/firestore';
import { PatientNavbar } from '../../shared/patient-navbar/patient-navbar';
import { AppointmentBookingDialog } from '../../shared/appointment-booking-dialog/appointment-booking-dialog';

@Component({
  selector: 'app-doctors',
  imports: [CommonModule, FormsModule, PatientNavbar, AppointmentBookingDialog],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
})
export class Doctors {
  doctors: Doctor[] = [];
  search = '';
  branch = '';
  specialization = '';
  hmo = '';
  expandedId = '';
  page = 1;
  pageSize = 6;
  bookingDoctor: Doctor | null = null;
  private subscription?: Subscription;

  constructor(private readonly firestoreService: Firestore) {
    this.firestoreService.ensureDoctorsSeeded();
    this.subscription = this.firestoreService.watchDoctors().subscribe((items) => (this.doctors = items));
  }

  get filteredDoctors(): Doctor[] {
    return this.doctors.filter((doctor) => {
      const bySearch = doctor.doctorName.toLowerCase().includes(this.search.toLowerCase());
      const byBranch = this.branch ? doctor.branch === this.branch : true;
      const bySpec = this.specialization ? doctor.specialization === this.specialization : true;
      const byHmo = this.hmo ? doctor.hmo === this.hmo : true;
      return bySearch && byBranch && bySpec && byHmo;
    });
  }

  get paginatedDoctors(): Doctor[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredDoctors.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDoctors.length / this.pageSize));
  }

  get branchOptions(): string[] {
    return [...new Set(this.doctors.map((doctor) => doctor.branch))].sort();
  }

  get specializationOptions(): string[] {
    return [...new Set(this.doctors.map((doctor) => doctor.specialization))].sort();
  }

  get hmoOptions(): string[] {
    return [...new Set(this.doctors.map((doctor) => doctor.hmo))].sort();
  }

  preArrangeVisit(doctor: Doctor): void {
    this.bookingDoctor = doctor;
  }

  onBookingOpenChange(open: boolean): void {
    if (!open) {
      this.bookingDoctor = null;
    }
  }

  onFilterChange(): void {
    this.page = 1;
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? '' : id;
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
    }
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  clearFilters(): void {
    this.search = '';
    this.branch = '';
    this.specialization = '';
    this.hmo = '';
    this.page = 1;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
