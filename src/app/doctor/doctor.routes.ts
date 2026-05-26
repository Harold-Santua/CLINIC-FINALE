import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth-guard';
import { roleGuard } from '../guards/role-guard';
import { Dashboard } from './dashboard/dashboard';
import { DoctorShell } from './doctor-shell/doctor-shell';
import { Schedule } from './schedule/schedule';

export const DOCTOR_ROUTES: Routes = [
  {
    path: '',
    component: DoctorShell,
    canActivate: [authGuard, roleGuard],
    data: { role: 'doctor' },
    children: [
      { path: '', pathMatch: 'full', component: Dashboard },
      { path: 'schedule', component: Schedule },
    ],
  },
];
