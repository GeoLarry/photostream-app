import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// e.g. canActivate: [authGuard, permissionGuard('Users.View')]. Signed-in users without the permission
// go to the photostream. The API enforces the same permission on every request; this only keeps the page tidy.
export function permissionGuard(permission: string): CanActivateFn {
  return () => inject(AuthService).hasPermission(permission) ? true : inject(Router).createUrlTree(['/']);
}
