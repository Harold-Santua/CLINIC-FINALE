import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, UserRole } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  selectedRole: UserRole | '' = '';
  warningMessage = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private readonly authService: Auth,
    private readonly router: Router,
  ) {}

  async login(): Promise<void> {
    this.warningMessage = '';
    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim() || !this.selectedRole) {
      this.warningMessage = 'Please fill in email, password, and select a role.';
      return;
    }

    try {
      this.isLoading = true;
      await this.authService.login(this.email.trim(), this.password, this.selectedRole);
      await this.router.navigateByUrl(this.authService.getRedirectRoute(this.selectedRole));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to sign in.';
    } finally {
      this.isLoading = false;
    }
  }
}
