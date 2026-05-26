export interface AppEnvironment {
  production: boolean;
  useEmulators: boolean;
  /** URL opened after password reset; built with window origin when relative. */
  passwordResetContinueUrl?: string;
}
