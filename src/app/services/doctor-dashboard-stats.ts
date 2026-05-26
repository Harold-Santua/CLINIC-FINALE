import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Appointment, displayAppointmentStatus } from '../interfaces/appointment';
import { DoctorAppointments } from './doctor-appointments';

export type ChartPeriod = 'daily' | 'weekly' | 'monthly';

export interface DoctorDashboardMetrics {
  totalPatients: number;
  newPatients: number;
  totalOperations: number;
  pendingAppointments: number;
  todayAppointments: number;
  totalAppointments: number;
}

export interface PieChartSegment {
  label: string;
  value: number;
  color: string;
  percent: number;
}

const SEGMENT_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  'Doctor approved': '#3b82f6',
  'Awaiting admin': '#8b5cf6',
  Completed: '#10b981',
  'Rejected / cancelled': '#ef4444',
};

@Injectable({
  providedIn: 'root',
})
export class DoctorDashboardStats {
  constructor(private readonly doctorAppointments: DoctorAppointments) {}

  watchStats(): Observable<DoctorDashboardMetrics> {
    return this.doctorAppointments.watchMyAppointments().pipe(
      map((state) => this.computeStats(state.appointments)),
    );
  }

  watchPieChart(period: ChartPeriod): Observable<PieChartSegment[]> {
    return this.doctorAppointments.watchMyAppointments().pipe(
      map((state) => this.computePieSegments(state.appointments, period)),
    );
  }

  private computeStats(appointments: Appointment[]): DoctorDashboardMetrics {
    const patientIds = new Set<string>();
    const newPatientIds = new Set<string>();
    const weekAgo = this.daysAgoIso(7);
    let totalOperations = 0;
    let pendingAppointments = 0;
    let todayAppointments = 0;
    const today = this.todayIso();

    for (const item of appointments) {
      if (item.patientId) {
        patientIds.add(item.patientId);
        const created = item.createdAt ?? '';
        if (created >= weekAgo) {
          newPatientIds.add(item.patientId);
        }
      }
      const status = displayAppointmentStatus(String(item.status));
      if (status === 'admin_approved') {
        totalOperations += 1;
      }
      if (status === 'pending') {
        pendingAppointments += 1;
      }
      if (item.appointmentDate === today) {
        todayAppointments += 1;
      }
    }

    return {
      totalPatients: patientIds.size,
      newPatients: newPatientIds.size,
      totalOperations,
      pendingAppointments,
      todayAppointments,
      totalAppointments: appointments.length,
    };
  }

  private computePieSegments(appointments: Appointment[], period: ChartPeriod): PieChartSegment[] {
    const filtered = appointments.filter((item) => this.inPeriod(item, period));
    const buckets: Record<string, number> = {
      Pending: 0,
      'Doctor approved': 0,
      'Awaiting admin': 0,
      Completed: 0,
      'Rejected / cancelled': 0,
    };

    for (const item of filtered) {
      const status = displayAppointmentStatus(String(item.status));
      if (status === 'pending') {
        buckets['Pending'] += 1;
      } else if (status === 'doctor_approved') {
        buckets['Doctor approved'] += 1;
      } else if (status === 'waiting_admin_approval') {
        buckets['Awaiting admin'] += 1;
      } else if (status === 'admin_approved') {
        buckets['Completed'] += 1;
      } else {
        buckets['Rejected / cancelled'] += 1;
      }
    }

    const total = Object.values(buckets).reduce((sum, n) => sum + n, 0);
    if (total === 0) {
      return [{ label: 'No data', value: 1, color: '#cbd5e1', percent: 100 }];
    }

    return Object.entries(buckets)
      .filter(([, value]) => value > 0)
      .map(([label, value]) => ({
        label,
        value,
        color: SEGMENT_COLORS[label] ?? '#64748b',
        percent: Math.round((value / total) * 1000) / 10,
      }));
  }

  private inPeriod(item: Appointment, period: ChartPeriod): boolean {
    const date = item.appointmentDate || item.createdAt?.slice(0, 10) || '';
    if (!date) {
      return false;
    }
    if (period === 'daily') {
      return date === this.todayIso();
    }
    if (period === 'weekly') {
      return date >= this.daysAgoIso(7);
    }
    return date >= this.daysAgoIso(30);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgoIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
