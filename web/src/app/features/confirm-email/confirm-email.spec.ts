import type { MockOf } from '../../shared/testing/mock-of';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmEmail } from './confirm-email';
import { AuthService } from '../../shared/services/auth.service';

describe('ConfirmEmail', () => {
  let fixture: ComponentFixture<ConfirmEmail>;
  let auth: MockOf<AuthService, 'confirmEmail'>;
  let router: Router;
  let snackBar: MockOf<MatSnackBar, 'open'>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function create(token?: string) {
    fixture = TestBed.createComponent(ConfirmEmail);
    if (token) fixture.componentRef.setInput('token', token);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth = {
      confirmEmail: vi.fn().mockName('AuthService.confirmEmail')
    };
    snackBar = {
      open: vi.fn().mockName('MatSnackBar.open')
    };
    await TestBed.configureTestingModule({
      imports: [ConfirmEmail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('confirms the email, welcomes the user and opens the photostream', async () => {
    auth.confirmEmail.mockResolvedValue();

    await create('link-token');

    expect(auth.confirmEmail).toHaveBeenCalledWith('link-token');
    expect(snackBar.open).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('explains an invalid or expired link and offers a new one', async () => {
    auth.confirmEmail.mockRejectedValue(new HttpErrorResponse({ status: 400, error: { message: 'This link is invalid or has expired.' } }));

    await create('old-token');
    fixture.detectChanges();

    expect(text()).toContain('This link is invalid or has expired.');
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/check-email"]')).not.toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not call the API without a token', async () => {
    await create();
    fixture.detectChanges();

    expect(auth.confirmEmail).not.toHaveBeenCalled();
    expect(text()).toContain('This link is incomplete');
  });
});
