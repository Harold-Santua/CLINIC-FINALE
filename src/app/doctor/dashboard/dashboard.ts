import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, Subscription, switchMap } from 'rxjs';
import { Appointment, displayAppointmentStatus } from '../../interfaces/appointment';
import { Appointment as AppointmentService } from '../../services/appointment';
import {
  ChartPeriod,
  DoctorDashboardMetrics,
  DoctorDashboardStats as DashboardStatsService,
  PieChartSegment,
} from '../../services/doctor-dashboard-stats';
import { DoctorAppointments } from '../../services/doctor-appointments';
import { AppointmentStatusLabelPipe } from '../../pipes/appointment-status-label-pipe';
import { DoctorAppointmentActions } from '../../shared/doctor-appointment-actions/doctor-appointment-actions';
import { DashboardPieChart } from '../../shared/dashboard-pie-chart/dashboard-pie-chart';
import { DashboardStatCard } from '../../shared/dashboard-stat-card/dashboard-stat-card';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HealthcareShell,
    Sidebar,
    AppointmentStatusLabelPipe,
    DoctorAppointmentActions,
    DashboardStatCard,
    DashboardPieChart,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  appointments: Appointment[] = [];
  appointmentsStreamError: string | null = null;
  stats: DoctorDashboardMetrics = {
    totalPatients: 0,
    newPatients: 0,
    totalOperations: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
    totalAppointments: 0,
  };
  pieSegments: PieChartSegment[] = [];
  chartPeriod: ChartPeriod = 'weekly';
  notes: Record<string, string> = {};

  private readonly chartPeriod$ = new BehaviorSubject<ChartPeriod>('weekly');
  private subscription = new Subscription();

  constructor(
    private readonly doctorAppointments: DoctorAppointments,
    private readonly dashboardStats: DashboardStatsService,
    private readonly appointmentService: AppointmentService,
    private readonly toast: ToastState,
  ) {
    this.subscription.add(
      this.doctorAppointments.watchMyAppointments().subscribe((state) => {
        this.appointments = state.appointments;
        this.appointmentsStreamError = state.streamError;
      }),
    );
    this.subscription.add(this.dashboardStats.watchStats().subscribe((s) => (this.stats = s)));
    this.subscription.add(
      this.chartPeriod$
        .pipe(switchMap((period) => this.dashboardStats.watchPieChart(period)))
        .subscribe((segments) => {
          this.pieSegments = segments;
        }),
    );
  }

  setChartPeriod(period: ChartPeriod): void {
    this.chartPeriod = period;
    this.chartPeriod$.next(period);
  }

  private n(item: Appointment): Appointment['status'] {
    return displayAppointmentStatus(String(item.status));
  }

  get actionQueue(): Appointment[] {
    return this.appointments.filter((item) => this.n(item) === 'pending');
  }

  get doctorApprovedQueue(): Appointment[] {
    return this.appointments.filter((item) => this.n(item) === 'doctor_approved');
  }

  get waitingAdminQueue(): Appointment[] {
    return this.appointments.filter((item) => this.n(item) === 'waiting_admin_approval');
  }

  get finalizedForFeedback(): Appointment[] {
    return this.appointments.filter((item) => this.n(item) === 'admin_approved');
  }

  async addFeedback(id: string): Promise<void> {
    try {
      await this.appointmentService.addFeedback(id, this.notes[id] ?? '');
      this.toast.show('Feedback saved.', 'success');
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Could not save feedback.';
      this.toast.show(m, 'error');
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
