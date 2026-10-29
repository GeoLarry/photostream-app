import { Component, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { apiErrorCode, apiErrorMessage, safeReturnUrl } from '../../shared/http/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatCard, MatFormField, MatLabel, MatInput, MatError, MatButton, MatProgressSpinner],
  templateUrl: './login.html',
})
export class Login {

  private auth = inject(AuthService);
  private router = inject(Router);

  // ?returnUrl=/favorites, set by the guards and the interceptor
  returnUrl = input<string>();

  form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submitting = signal(false);
  error = signal<string | null>(null);
  // The password was right but the email is not confirmed yet: offer to resend the link
  needsConfirmation = signal(false);

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.needsConfirmation.set(false);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.needsConfirmation.set(apiErrorCode(error) === 'EmailNotConfirmed');
      const wrongCredentials = error instanceof HttpErrorResponse && error.status === 401;
      this.error.set(wrongCredentials ? 'Wrong username or password.' : apiErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  // The resend page needs an email address; pass it on when the user signed in with one.
  resendQueryParams(): Record<string, string> {
    const value = this.form.controls.username.value.trim();
    return value.includes('@') ? { email: value } : {};
  }
}
