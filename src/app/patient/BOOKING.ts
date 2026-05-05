import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './BOOKING.html',
  styleUrls: ['./patient.css']
})
export class Booking {

  appointments: any[] = [];

  ngOnInit() {
    this.loadAppointments();
  }

  loadAppointments() {
    this.appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  }

}