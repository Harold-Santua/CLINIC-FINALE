import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { PasswordReset } from '../../services/password-reset';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { LoadingState } from '../../shared/loading-state';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HealthcareShell],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  form: ReturnType<FormBuilder['group']>;
  sent = false;
  successMessage = '';
  submitting = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: Auth,
    private readonly passwordResetService: PasswordReset,
    private readonly loading: LoadingState,
    private readonly toast: ToastState,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Enter a valid email address.', 'error');
      return;
    }
    if (this.submitting) {
      return;
    }
    try {
      this.submitting = true;
      this.loading.setLoading(true);
      const email = this.form.getRawValue().email as string;
      const result = await this.authService.forgotPassword(email);
      this.sent = true;
      this.successMessage = this.passwordResetService.successMessage(result);
      this.toast.show('Reset link created (emulator).', 'success');
    } catch (error) {
      this.sent = false;
      const message = this.passwordResetService.mapError(error);
      this.toast.show(message, 'error');
    } finally {
      this.submitting = false;
      this.loading.setLoading(false);
    }
  }
}
