import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../shared/services/auth.service';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const fill = (username: string, password: string) => component.form.setValue({ username, password });

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('does not call the API with an empty form', async () => {
    await component.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in and goes to the return URL', async () => {
    auth.login.and.resolveTo();
    fixture.componentRef.setInput('returnUrl', '/favorites');
    fill('jane', 'Password1');

    await component.submit();

    expect(auth.login).toHaveBeenCalledWith({ username: 'jane', password: 'Password1' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/favorites');
  });

  it('ignores a return URL to another site', async () => {
    auth.login.and.resolveTo();
    fixture.componentRef.setInput('returnUrl', 'https://evil.example');
    fill('jane', 'Password1');

    await component.submit();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows a clear message for wrong credentials', async () => {
    auth.login.and.rejectWith(new HttpErrorResponse({ status: 401 }));
    fill('jane', 'wrong');

    await component.submit();
    await fixture.whenStable();

    expect(text()).toContain('Wrong username or password.');
    expect(text()).not.toContain('Resend confirmation email');
  });

  it('offers to resend the link when the email is not confirmed', async () => {
    auth.login.and.rejectWith(new HttpErrorResponse({
      status: 403,
      error: { message: 'Please confirm your email address first.', code: 'EmailNotConfirmed' },
    }));
    fill('jane@example.com', 'Password1');

    await component.submit();
    await fixture.whenStable();

    expect(text()).toContain('Please confirm your email address first.');
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href^="/check-email"]');
    expect(link?.getAttribute('href')).toBe('/check-email?email=jane@example.com');
  });
});
