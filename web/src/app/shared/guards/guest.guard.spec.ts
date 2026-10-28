import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('guestGuard', () => {
  const isAuthenticated = signal(false);

  const run = () => TestBed.runInInjectionContext(() =>
    guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { isAuthenticated } }],
    });
  });

  it('lets signed-out visitors in', () => {
    isAuthenticated.set(false);
    expect(run()).toBeTrue();
  });

  it('sends signed-in users to the photostream', () => {
    isAuthenticated.set(true);
    const result = run() as UrlTree;
    expect(result.toString()).toBe('/');
  });
});
