import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Home } from './home/home';
import { Admin } from './admin/admin';
import { Doctor } from './doctor/doctor';
import { Patient } from './patient/patient';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'home', component: Home },
  { path: 'admin', component: Admin },
  { path: 'doctor', component: Doctor },
  { path: 'patient', component: Patient },
  { path: '**', redirectTo: '' }
];
