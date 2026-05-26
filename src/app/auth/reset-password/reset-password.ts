import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordReset } from '../../services/password-reset';
import { HealthcareShell } from '../../shared/healthcare-shell/healthcare-shell';
import { LoadingState } from '../../shared/loading-state';
import { ToastState } from '../../shared/toast-state';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HealthcareShell],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  form: ReturnType<FormBuilder['group']>;
  oobCode = '';
  emailHint = '';
  codeValid = false;
  codeError = '';
  completed = false;
  submitting = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly passwordReset: PasswordReset,
    private readonly loading: LoadingState,
    private readonly toast: ToastState,
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatch },
    );
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.oobCode = (params.get('oobCode') ?? params.get('code') ?? '').trim();
    if (!this.oobCode) {
      this.codeError = 'Missing reset code. Request a new link from Forgot Password or copy one from Emulator UI.';
      return;
    }
    void this.verifyCode();
  }

  private passwordsMatch(group: ReturnType<FormBuilder['group']>): { mismatch: boolean } | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password && confirm && password !== confirm ? { mismatch: true } : null;
  }

  private async verifyCode(): Promise<void> {
    try {
      this.loading.setLoading(true);
      this.emailHint = await this.passwordReset.verifyResetCode(this.oobCode);
      this.codeValid = true;
    } catch (error) {
      this.codeValid = false;
      this.codeError = this.passwordReset.mapError(error);
    } finally {
      this.loading.setLoading(false);
    }
  }

  async submit(): Promise<void> {
    if (!this.codeValid || !this.oobCode) {
      this.toast.show(this.codeError || 'Invalid reset link.', 'error');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show('Enter a valid password (min. 6 characters).', 'error');
      return;
    }
    if (this.submitting) {
      return;
    }
    try {
      this.submitting = true;
      this.loading.setLoading(true);
      const password = this.form.getRawValue().password as string;
      await this.passwordReset.completeReset(this.oobCode, password);
      this.completed = true;
      this.toast.show('Password updated. You can sign in now.', 'success');
      setTimeout(() => void this.router.navigate(['/login']), 2000);
    } catch (error) {
      this.toast.show(this.passwordReset.mapError(error), 'error');
    } finally {
      this.submitting = false;
      this.loading.setLoading(false);
    }
  }
}
