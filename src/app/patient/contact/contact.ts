import { Component } from '@angular/core';
import { PatientNavbar } from '../../shared/patient-navbar/patient-navbar';

@Component({
  selector: 'app-contact',
  imports: [PatientNavbar],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {}
