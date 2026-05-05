import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor-portal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.css']
})
export class DoctorComponent implements OnInit {

  appointments: any[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  }

  logout() {
    this.router.navigate(['/']);
  }
}