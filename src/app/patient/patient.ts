import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient.html',
  styleUrls: ['./patient.css']
})
export class Patient {

  currentPage: string = 'home';

  constructor(public router: Router) {}

  navigate(page: string) {
    this.currentPage = page;
  }

  logout() {
    this.router.navigate(['/']);
  }
}