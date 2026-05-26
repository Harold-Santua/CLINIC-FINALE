import { Routes } from '@angular/router';
import { authGuard } from '../guards/auth-guard';
import { roleGuard } from '../guards/role-guard';
import { Contact } from './contact/contact';
import { Doctors } from './doctors/doctors';
import { Home } from './home/home';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { role: 'patient' },
    children: [
      { path: '', pathMatch: 'full', component: Home },
      { path: 'doctors', component: Doctors },
      { path: 'contact', component: Contact },
    ],
  },
];
