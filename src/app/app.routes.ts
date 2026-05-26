import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./auth/auth.routes').then((m) => m.AUTH_ROUTES) },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
  { path: 'doctor', loadChildren: () => import('./doctor/doctor.routes').then((m) => m.DOCTOR_ROUTES) },
  { path: 'patient', loadChildren: () => import('./patient/patient.routes').then((m) => m.PATIENT_ROUTES) },
  { path: '**', redirectTo: '' },
];
