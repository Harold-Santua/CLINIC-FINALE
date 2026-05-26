import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const expectedRole = route.data['role'] as string;

  if (authService.isAuthenticated() && authService.hasRole(expectedRole)) {
    return true;
  }

  return router.createUrlTree(['/']);
};
