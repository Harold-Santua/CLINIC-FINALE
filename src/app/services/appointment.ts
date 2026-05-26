import { Injectable } from '@angular/core';
import { Firestore } from './firestore';
import { AppointmentWorkflow } from './appointment-workflow';

@Injectable({
  providedIn: 'root',
})
export class Appointment {
  constructor(
    private readonly firestoreService: Firestore,
    private readonly workflow: AppointmentWorkflow,
  ) {}

  async createAppointment(payload: {
    patientId: string;
    doctorId: string;
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    symptoms?: string;
  }): Promise<void> {
    await this.firestoreService.createAppointmentAtomic(payload);
  }

  async doctorApprove(appointmentId: string): Promise<void> {
    await this.workflow.doctorApprove(appointmentId);
  }

  async doctorReject(appointmentId: string): Promise<void> {
    await this.workflow.doctorReject(appointmentId);
  }

  async doctorSendToAdmin(appointmentId: string): Promise<void> {
    await this.workflow.doctorSendToAdmin(appointmentId);
  }

  async adminFinalApprove(appointmentId: string): Promise<void> {
    await this.workflow.adminFinalApprove(appointmentId);
  }

  async adminFinalReject(appointmentId: string, adminRejectionReason: string): Promise<void> {
    await this.workflow.adminFinalReject(appointmentId, adminRejectionReason);
  }

  async patientWithdraw(appointmentId: string): Promise<void> {
    await this.workflow.patientWithdraw(appointmentId);
  }

  async addFeedback(appointmentId: string, feedback: string): Promise<void> {
    await this.firestoreService.updateAppointmentFeedback(appointmentId, feedback);
  }
}
