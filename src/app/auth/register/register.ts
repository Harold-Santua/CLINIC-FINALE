import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../interfaces/user';
import { Auth } from '../../services/auth';
import { LoadingState } from '../../shared/loading-state';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HealthcareShell],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  form: ReturnType<FormBuilder['group']>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: Auth,
    private readonly loading: LoadingState,
    private readonly toast: ToastState,
    private readonly router: Router,
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['patient' as UserRole, [Validators.required]],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Please complete the registration form.', 'error');
      return;
    }
    const { fullName, email, password, role } = this.form.getRawValue();
    try {
      this.loading.setLoading(true);
      await this.authService.register(email!, password!, role!, fullName!);
      this.toast.show('Registration successful.', 'success');
      await this.router.navigateByUrl(`/${role}`);
    } catch (error) {
      this.toast.show(this.getRegistrationErrorMessage(error), 'error');
    } finally {
      this.loading.setLoading(false);
    }
  }

  private getRegistrationErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Registration failed.';
    if (message.includes('auth/email-already-in-use')) {
      return 'This email is already registered. Please login instead.';
    }
    if (message.includes('PERMISSION_DENIED')) {
      return 'Firestore access denied. Make sure Firebase emulators are running.';
    }
    return message;
  }
}
