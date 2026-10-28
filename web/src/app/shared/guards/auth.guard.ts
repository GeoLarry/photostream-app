import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Pages for signed-in users: everyone else goes to the login page and comes back afterwards.
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthService).isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
