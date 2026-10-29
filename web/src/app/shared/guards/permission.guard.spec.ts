import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { permissionGuard } from './permission.guard';
import { AuthService } from '../services/auth.service';

describe('permissionGuard', () => {
  let permissions: string[];

  const run = () => TestBed.runInInjectionContext(() => permissionGuard('Users.View')({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    permissions = [];
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { hasPermission: (p: string) => permissions.includes(p) } }],
    });
  });

  it('lets in users with the permission', () => {
    permissions = ['Users.View'];
    expect(run()).toBe(true);
  });

  it('sends everyone else to the photostream', () => {
    permissions = ['Favorites.View'];
    expect((run() as UrlTree).toString()).toBe('/');
  });
});
