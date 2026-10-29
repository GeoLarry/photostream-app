import type { MockOf } from '../../shared/testing/mock-of';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Register } from './register';
import { AuthService } from '../../shared/services/auth.service';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let component: Register;
  let auth: MockOf<AuthService, 'register'>;
  let router: Router;

  const valid = { firstName: ' Jane ', lastName: '', username: 'jane.doe', email: 'jane@example.com', password: 'Password1' };

  beforeEach(async () => {
    auth = {
      register: vi.fn().mockName('AuthService.register')
    };
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('applies the same rules as the API', () => {
    const { username, password, email } = component.form.controls;

    username.setValue('ab');
    expect(username.hasError('pattern')).toBe(true);
    username.setValue('jane doe');
    expect(username.hasError('pattern')).toBe(true);
    username.setValue('jane.doe');
    expect(username.valid).toBe(true);

    password.setValue('password');
    expect(password.hasError('pattern')).toBe(true); // no digit
    password.setValue('12345678');
    expect(password.hasError('pattern')).toBe(true); // no letter
    password.setValue('Pass1');
    expect(password.hasError('pattern')).toBe(true); // too short
    password.setValue('Password1');
    expect(password.valid).toBe(true);

    email.setValue('not-an-email');
    expect(email.invalid).toBe(true);
  });

  it('does not call the API with an invalid form', async () => {
    await component.submit();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('signs up and goes to "check your email"', async () => {
    auth.register.mockResolvedValue('Check your email.');
    component.form.setValue(valid);

    await component.submit();

    expect(auth.register).toHaveBeenCalledWith({
      username: 'jane.doe', email: 'jane@example.com', password: 'Password1', firstName: 'Jane', lastName: null,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/check-email'], { queryParams: { email: 'jane@example.com' } });
  });

  it('shows the error the API returned', async () => {
    auth.register.mockRejectedValue(new HttpErrorResponse({ status: 400, error: { message: 'This username is already taken.' } }));
    component.form.setValue(valid);

    await component.submit();
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('This username is already taken.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
