import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Doctor } from '../../interfaces/doctor';
import { User } from '../../interfaces/user';
import { Firestore } from '../../services/firestore';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-doctor-record-links',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './doctor-record-links.html',
  styleUrl: './doctor-record-links.css',
})
export class DoctorRecordLinks implements OnDestroy {
  doctorUsers: User[] = [];
  catalogDoctors: Doctor[] = [];
  selectedUserUid = '';
  selectedCatalogDoctorId = '';
  private readonly subs: Subscription[] = [];

  constructor(
    private readonly firestore: Firestore,
    private readonly toast: ToastState,
  ) {
    this.subs.push(
      this.firestore.watchUsers('doctor').subscribe((users) => (this.doctorUsers = users)),
      this.firestore.watchDoctors().subscribe((doctors) => (this.catalogDoctors = doctors)),
    );
  }

  resolveCatalogName(recordId: string | undefined): string {
    if (!recordId) {
      return '—';
    }
    const match = this.catalogDoctors.find((d) => d.id === recordId);
    return match ? match.doctorName : recordId;
  }

  async link(): Promise<void> {
    if (!this.selectedUserUid || !this.selectedCatalogDoctorId) {
      this.toast.show('Select both a doctor account and a directory doctor.', 'error');
      return;
    }
    try {
      await this.firestore.updateUser(this.selectedUserUid, { doctorRecordId: this.selectedCatalogDoctorId });
      this.toast.show('Doctor record linked. Ask the doctor to sign out and sign in again.', 'success');
      this.selectedUserUid = '';
      this.selectedCatalogDoctorId = '';
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update failed.';
      this.toast.show(message, 'error');
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
