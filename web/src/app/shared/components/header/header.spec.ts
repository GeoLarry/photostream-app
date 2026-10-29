import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Header } from './header';
import { AuthService } from '../../services/auth.service';
import { CurrentUser } from '../../../models/auth.model';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  const currentUser = signal<CurrentUser | null>(null);
  const permissions = signal<string[]>([]);
  let auth: {
    currentUser: typeof currentUser;
    hasPermission: (p: string) => boolean;
    logout: Mock;
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    currentUser.set(null);
    permissions.set([]);
    auth = { currentUser, hasPermission: p => permissions().includes(p), logout: vi.fn().mockName('logout') };
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
  });

  it('offers log in and sign up when signed out', () => {
    expect(text()).toContain('Log in');
    expect(text()).toContain('Sign up');
    expect(text()).not.toContain('Log out');
  });

  it('shows the user and logs out', async () => {
    currentUser.set({ id: 1, username: 'jane', email: 'j@example.com', firstName: 'Jane', lastName: null, roles: [], permissions: [] });
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(text()).toContain('Jane');
    expect(text()).not.toContain('Sign up');

    const logout = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Log out'))!;
    logout.click();

    expect(auth.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the Admin link only to users who may view users', () => {
    const jane: CurrentUser = { id: 1, username: 'jane', email: 'j@example.com', firstName: null, lastName: null, roles: [], permissions: [] };
    currentUser.set(jane);
    fixture.detectChanges();
    expect(text()).not.toContain('Admin');

    permissions.set(['Users.View']);
    fixture.detectChanges();
    const admin = (fixture.nativeElement as HTMLElement).querySelector('a[href="/admin/users"]');
    expect(admin?.textContent).toContain('Admin');
  });
});
