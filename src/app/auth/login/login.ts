import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../interfaces/user';
import { Auth } from '../../services/auth';
import { LoadingState } from '../../shared/loading-state';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  logoPath = 'HOSPITAL.png';
  form: ReturnType<FormBuilder['group']>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: Auth,
    private readonly router: Router,
    private readonly loading: LoadingState,
    private readonly toast: ToastState,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['patient' as UserRole, [Validators.required]],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Please complete all required fields.', 'error');
      return;
    }
    const { email, password, role } = this.form.getRawValue();
    try {
      this.loading.setLoading(true);
      const userRole = await this.authService.login(email!, password!, role!);
      await this.router.navigateByUrl(`/${userRole}`);
      this.toast.show('Login successful.', 'success');
    } catch (error) {
      this.toast.show(this.getAuthErrorMessage(error), 'error');
    } finally {
      this.loading.setLoading(false);
    }
  }

  private getAuthErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : 'Invalid login.';
    if (message.includes('auth/user-not-found')) {
      return 'No account found for this email. Please register first.';
    }
    if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
      return 'Invalid email or password.';
    }
    if (message.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please try again in a few minutes.';
    }
    if (message.includes('PERMISSION_DENIED')) {
      return 'Access denied by Firestore rules. Please start Firebase emulators and deploy updated rules.';
    }
    return message;
  }
}
