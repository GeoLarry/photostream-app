import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { Header } from './header';
import { AuthService } from '../../services/auth.service';
import { CurrentUser } from '../../../models/auth.model';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  const currentUser = signal<CurrentUser | null>(null);
  let auth: { currentUser: typeof currentUser; logout: jasmine.Spy };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    currentUser.set(null);
    auth = { currentUser, logout: jasmine.createSpy('logout') };
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
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    expect(text()).toContain('Jane');
    expect(text()).not.toContain('Sign up');

    const logout = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Log out'))!;
    logout.click();

    expect(auth.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
