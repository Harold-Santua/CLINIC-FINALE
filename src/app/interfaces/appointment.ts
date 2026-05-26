export type AppointmentStatus =
  | 'pending'
  | 'doctor_approved'
  | 'waiting_admin_approval'
  | 'admin_approved'
  | 'doctor_rejected'
  | 'admin_rejected'
  | 'cancelled';

export type AppointmentRejectedBy = 'patient' | 'doctor' | 'admin';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  /** Patient symptoms / visit details at booking time. */
  symptoms?: string;
  /** Set when status is doctor_rejected or admin_rejected (who initiated). */
  rejectedBy?: AppointmentRejectedBy;
  /** Admin rejection reason shown on the patient dashboard. */
  adminRejectionReason?: string;
  /** ISO timestamp when doctor sent the case to admin. */
  submittedToAdminAt?: string;
  /** Doctor clinical notes after admin approval. */
  feedback?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Map<String> length in minutes for doctor availability after booking. */
export const APPOINTMENT_BLOCK_MINUTES = 60;

/** Map legacy emulator documents to current workflow statuses (display + filters). */
export function displayAppointmentStatus(status: string): AppointmentStatus {
  const legacy: Record<string, AppointmentStatus> = {
    approved: 'doctor_approved',
    completed: 'admin_approved',
    rejected: 'cancelled',
    doctor_rejected: 'doctor_rejected',
    admin_rejected: 'admin_rejected',
  };
  return legacy[status] ?? (status as AppointmentStatus);
}

/** True when the appointment still occupies the doctor's 1-hour block. */
export function appointmentBlocksSchedule(status: string): boolean {
  const s = displayAppointmentStatus(status);
  return (
    s === 'pending' ||
    s === 'doctor_approved' ||
    s === 'waiting_admin_approval' ||
    s === 'admin_approved'
  );
}
