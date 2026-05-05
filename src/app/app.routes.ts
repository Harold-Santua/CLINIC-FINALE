import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Home } from './home/home';
import { Admin } from './admin/admin';
import { DoctorComponent } from './doctor/doctor';
import { Appoint } from './patient/DoctorPage';
import { Patient } from './patient/patient';
import { About } from './patient/About';
import { Booking } from './patient/BOOKING';


export const routes: Routes = [
  { path: '', component: Login },
  { path: 'home', component: Home },
  { path: 'about', component: About },    
  { path: 'booking', component: Booking },
  { path: 'Appoint', component: Appoint },
  { path: 'admin', component: Admin },
  { path: 'doctor', component: DoctorComponent },
  { path: 'patient', component: Patient },
  { path: '**', redirectTo: '' }
];
