import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth-guard';
import { roleGuard } from '../guards/role-guard';
import { Appointments } from './appointments/appointments';
import { Dashboard } from './dashboard/dashboard';
import { DoctorRecordLinks } from './doctor-record-links/doctor-record-links';
import { Users } from './users/users';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' },
    children: [
      { path: '', component: Dashboard },
      { path: 'appointments', component: Appointments },
      { path: 'users', component: Users },
      { path: 'doctor-records', component: DoctorRecordLinks },
    ],
  },
];
