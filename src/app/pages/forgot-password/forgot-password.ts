import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';
  message = '';
  error = '';

  constructor(private readonly authService: Auth) {}

  async sendReset(): Promise<void> {
    this.message = '';
    this.error = '';
    if (!this.email.trim()) {
      this.error = 'Email is required.';
      return;
    }

    try {
      await this.authService.forgotPassword(this.email.trim());
      this.message = 'Password reset email sent using Firebase Auth emulator.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not send reset email.';
    }
  }
}
