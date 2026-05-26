import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  useEmulators: true,
  passwordResetContinueUrl: '/reset-password',
};
