import { Injectable } from '@angular/core';
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  type ActionCodeSettings,
} from 'firebase/auth';
import { auth } from '../core/firebase';
import { environment } from '../../environments/environment';

export interface PasswordResetResult {
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class PasswordReset {
  /** Sends a reset link via Auth emulator (link appears in Emulator UI). */
  async sendResetEmail(email: string): Promise<PasswordResetResult> {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('Enter a valid email address.');
    }

    await sendPasswordResetEmail(auth, normalized, this.buildActionCodeSettings());
    return { email: normalized };
  }

  async verifyResetCode(oobCode: string): Promise<string> {
    return verifyPasswordResetCode(auth, oobCode.trim());
  }

  async completeReset(oobCode: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    await confirmPasswordReset(auth, oobCode.trim(), newPassword);
  }

  mapError(error: unknown): string {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';
    const message = error instanceof Error ? error.message : 'Password reset request failed.';

    if (message.includes('Enter a valid email') || message.includes('at least 6 characters')) {
      return message;
    }
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found for this email. Register first, then try again.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many reset attempts. Please wait a few minutes and try again.';
      case 'auth/invalid-action-code':
      case 'auth/expired-action-code':
        return 'This reset link is invalid or expired. Request a new link from Forgot Password.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      default:
        break;
    }
    return message;
  }

  successMessage(result: PasswordResetResult): string {
    return `Reset link generated for ${result.email}. Open Firebase Emulator UI (http://127.0.0.1:4000) → Authentication to copy the link, or use the link if it opens this app at /reset-password.`;
  }

  private buildActionCodeSettings(): ActionCodeSettings | undefined {
    const path = environment.passwordResetContinueUrl?.trim();
    if (!path) {
      return undefined;
    }
    const url =
      path.startsWith('http://') || path.startsWith('https://')
        ? path
        : typeof window !== 'undefined'
          ? `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
          : path;
    return {
      url,
      handleCodeInApp: true,
    };
  }
}
