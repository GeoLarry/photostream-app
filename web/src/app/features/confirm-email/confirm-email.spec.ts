import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmEmail } from './confirm-email';
import { AuthService } from '../../shared/services/auth.service';

describe('ConfirmEmail', () => {
  let fixture: ComponentFixture<ConfirmEmail>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function create(token?: string) {
    fixture = TestBed.createComponent(ConfirmEmail);
    if (token) fixture.componentRef.setInput('token', token);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['confirmEmail']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
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
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  it('confirms the email, welcomes the user and opens the photostream', async () => {
    auth.confirmEmail.and.resolveTo();

    await create('link-token');

    expect(auth.confirmEmail).toHaveBeenCalledWith('link-token');
    expect(snackBar.open).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('explains an invalid or expired link and offers a new one', async () => {
    auth.confirmEmail.and.rejectWith(new HttpErrorResponse({ status: 400, error: { message: 'This link is invalid or has expired.' } }));

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
