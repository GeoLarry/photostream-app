import type { MockOf } from '../../shared/testing/mock-of';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CheckEmail, RESEND_COOLDOWN_SECONDS } from './check-email';
import { AuthService } from '../../shared/services/auth.service';

describe('CheckEmail', () => {
  let fixture: ComponentFixture<CheckEmail>;
  let component: CheckEmail;
  let auth: MockOf<AuthService, 'resendConfirmation'>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function create(email?: string) {
    fixture = TestBed.createComponent(CheckEmail);
    component = fixture.componentInstance;
    if (email) fixture.componentRef.setInput('email', email);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth = {
      resendConfirmation: vi.fn().mockName('AuthService.resendConfirmation')
    };
    await TestBed.configureTestingModule({
      imports: [CheckEmail],
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('right after sign-up, shows the address and waits before allowing a resend', () => {
    // A mocked clock also stops the zoneless scheduler, so this test renders with detectChanges().
    vi.useFakeTimers();
    try {
      fixture = TestBed.createComponent(CheckEmail);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('email', 'jane@example.com');
      fixture.detectChanges();

      expect(text()).toContain('We sent a confirmation link to jane@example.com');
      expect(component.emailControl.value).toBe('jane@example.com');
      expect(component.cooldown()).toBe(RESEND_COOLDOWN_SECONDS);

      vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000);
      fixture.detectChanges();
      expect(component.cooldown()).toBe(0);
      expect(text()).toContain('Resend email');
    } finally {
      fixture.destroy(); // stops the interval before the real clock comes back
      vi.useRealTimers();
    }
  });

  it('sends a new link and shows the API message', async () => {
    auth.resendConfirmation.mockResolvedValue('If the address needs confirming, we sent it a link.');
    await create();
    component.emailControl.setValue('jane@example.com');

    await component.resend();
    await fixture.whenStable();

    expect(auth.resendConfirmation).toHaveBeenCalledWith('jane@example.com');
    expect(text()).toContain('we sent it a link');
    expect(component.cooldown()).toBe(RESEND_COOLDOWN_SECONDS);
  });

  it('does not send during the cooldown or with an invalid address', async () => {
    await create('jane@example.com');
    await component.resend();

    component.cooldown.set(0);
    component.emailControl.setValue('nope');
    await component.resend();

    expect(auth.resendConfirmation).not.toHaveBeenCalled();
  });

  it('shows an error when the request fails', async () => {
    auth.resendConfirmation.mockRejectedValue(new HttpErrorResponse({ status: 429, error: { message: 'Too many attempts. Please try again later.' } }));
    await create();
    component.emailControl.setValue('jane@example.com');

    await component.resend();
    await fixture.whenStable();

    expect(text()).toContain('Too many attempts');
  });
});
