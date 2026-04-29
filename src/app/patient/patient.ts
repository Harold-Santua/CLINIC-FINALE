import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './patient.html',
  styleUrls: ['./patient.css']
})
export class Patient {

  constructor(private router: Router) {}

  logout() {
    this.router.navigate(['/']); // back to login
  }
}