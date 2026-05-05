import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './DoctorPage.html',
  styleUrls: ['./patient.css']
})
export class Appoint {
  selectedTime: string = '';

  constructor(private router: Router) {}

  availability: any = {
    "8AM": ["doc1", "doc3"],
    "9AM": ["doc2", "doc4"],
    "10AM": ["doc1", "doc2"],
    "11AM": ["doc3"],
    "1PM": ["doc4"],
    "2PM": ["doc1", "doc4"],
    "3PM": ["doc2"],
    "4PM": ["doc3", "doc4"]
  };

  selectTime(time: string) {
    this.selectedTime = time;
  }

  isAvailable(docId: string): boolean {
    if (!this.selectedTime) return false;
    return this.availability[this.selectedTime]?.includes(docId);
  }

  bookAppointment(docId: string) {
  if (!this.selectedTime) {
    alert('Please select a time first!');
    return;
  }

  if (!this.isAvailable(docId)) {
    alert('This doctor is not available at this time.');
    return;
  }

  // ✅ ADD THIS PART
  const appointment = {
    name: "Patient Name",
    doctor: docId,
    time: this.selectedTime
  };

  let list = JSON.parse(localStorage.getItem('appointments') || '[]');
  list.push(appointment);
  localStorage.setItem('appointments', JSON.stringify(list));
  // ✅ END ADD

  this.router.navigate(['/booking']);
}
}