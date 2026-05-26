import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-patient-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './patient-navbar.html',
  styleUrl: './patient-navbar.css',
})
export class PatientNavbar {
  constructor(
    private readonly authService: Auth,
    private readonly router: Router,
  ) {}

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
