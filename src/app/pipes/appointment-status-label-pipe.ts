import { Pipe, PipeTransform } from '@angular/core';
import { AppointmentStatus, displayAppointmentStatus } from '../interfaces/appointment';

const LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pending (awaiting doctor)',
  doctor_approved: 'Doctor approved',
  waiting_admin_approval: 'Waiting for admin',
  admin_approved: 'Admin approved',
  doctor_rejected: 'Rejected by doctor',
  admin_rejected: 'Rejected by admin',
  cancelled: 'Cancelled',
};

@Pipe({
  name: 'appointmentStatusLabel',
  standalone: true,
})
export class AppointmentStatusLabelPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (value == null || value === '') {
      return '—';
    }
    const key = displayAppointmentStatus(value);
    return LABELS[key] ?? value;
  }
}
