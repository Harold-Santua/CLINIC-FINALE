import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, displayAppointmentStatus } from '../../interfaces/appointment';
import { Appointment as AppointmentService } from '../../services/appointment';
import { ToastState } from '../toast-state';

@Component({
  selector: 'app-admin-appointment-actions',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-appointment-actions.html',
  styleUrl: './admin-appointment-actions.css',
})
export class AdminAppointmentActions {
  @Input({ required: true }) item!: Appointment;

  showRejectForm = false;
  rejectionReason = '';
  customReason = '';

  readonly rejectionPresets = [
    'Doctor unavailable',
    'Schedule conflict',
    'Incomplete patient information',
  ];

  constructor(
    private readonly appointments: AppointmentService,
    private readonly toast: ToastState,
  ) {}

  private status(): Appointment['status'] {
    return displayAppointmentStatus(String(this.item.status));
  }

  get showFinalActions(): boolean {
    const s = this.status();
    return s === 'pending' || s === 'doctor_approved' || s === 'waiting_admin_approval';
  }

  cancelReject(): void {
    this.showRejectForm = false;
    this.rejectionReason = '';
    this.customReason = '';
  }

  toggleReject(): void {
    this.showRejectForm = !this.showRejectForm;
  }

  private err(e: unknown): void {
    const m = e instanceof Error ? e.message : 'Action failed.';
    this.toast.show(m, 'error');
  }

  async finalApprove(): Promise<void> {
    try {
      await this.appointments.adminFinalApprove(this.item.id);
      this.toast.show('Final approval recorded.', 'success');
    } catch (e) {
      this.err(e);
    }
  }

  async finalReject(): Promise<void> {
    const reason = (this.customReason.trim() || this.rejectionReason).trim();
    if (!reason) {
      this.toast.show('Select or enter a rejection reason for the patient.', 'error');
      return;
    }
    try {
      await this.appointments.adminFinalReject(this.item.id, reason);
      this.showRejectForm = false;
      this.rejectionReason = '';
      this.customReason = '';
      this.toast.show('Appointment rejected. Patient will see your feedback.', 'info');
    } catch (e) {
      this.err(e);
    }
  }
}
