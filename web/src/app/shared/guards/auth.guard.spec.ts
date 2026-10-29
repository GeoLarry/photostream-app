import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const isAuthenticated = signal(false);

  const run = () => TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/favorites' } as RouterStateSnapshot));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated } }],
    });
  });

  it('lets signed-in users in', () => {
    isAuthenticated.set(true);
    expect(run()).toBe(true);
  });

  it('sends visitors to the login page with a way back', () => {
    isAuthenticated.set(false);
    const result = run() as UrlTree;
    expect(result.toString()).toBe('/login?returnUrl=%2Ffavorites');
  });
});
