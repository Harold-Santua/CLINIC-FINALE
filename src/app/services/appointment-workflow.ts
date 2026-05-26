import { Injectable } from '@angular/core';
import { Appointment, displayAppointmentStatus } from '../interfaces/appointment';
import { Firestore } from './firestore';

@Injectable({
  providedIn: 'root',
})
export class AppointmentWorkflow {
  constructor(private readonly firestore: Firestore) {}

  async doctorApprove(appointmentId: string): Promise<void> {
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'doctor_approved' },
      { expectCurrentIn: ['pending'], actedBy: 'doctor' },
    );
  }

  async doctorReject(appointmentId: string): Promise<void> {
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'doctor_rejected', rejectedBy: 'doctor' },
      { expectCurrentIn: ['pending', 'doctor_approved', 'waiting_admin_approval'] },
    );
  }

  async doctorSendToAdmin(appointmentId: string): Promise<void> {
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'waiting_admin_approval' },
      { expectCurrentIn: ['doctor_approved'] },
    );
  }

  async adminFinalApprove(appointmentId: string): Promise<void> {
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'admin_approved' },
      { expectCurrentIn: ['pending', 'waiting_admin_approval'], actedBy: 'admin' },
    );
  }

  async adminFinalReject(appointmentId: string, adminRejectionReason: string): Promise<void> {
    const reason = adminRejectionReason.trim();
    if (!reason) {
      throw new Error('A rejection reason is required.');
    }
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'admin_rejected', rejectedBy: 'admin', adminRejectionReason: reason },
      { expectCurrentIn: ['pending', 'doctor_approved', 'waiting_admin_approval'] },
    );
  }

  async patientWithdraw(appointmentId: string): Promise<void> {
    await this.firestore.patchAppointmentAtomic(
      appointmentId,
      { status: 'cancelled', rejectedBy: 'patient' },
      { expectCurrentIn: ['pending'] },
    );
  }

  normalizedStatus(item: Appointment): Appointment['status'] {
    return displayAppointmentStatus(String(item.status));
  }
}
