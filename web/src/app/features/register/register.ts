import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { apiErrorMessage } from '../../shared/http/api-error';

// Same rules as the API (api/src/Starter.Infrastructure/Services/InputRules.cs), so most mistakes
// are caught before the request. The API stays the source of truth.
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,50}$/;
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatCard, MatFormField, MatLabel, MatHint, MatInput, MatError, MatButton, MatProgressSpinner],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './register.html',
})
export class Register {

  private auth = inject(AuthService);
  private router = inject(Router);

  form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  submitting = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const { firstName, lastName, username, email, password } = this.form.getRawValue();
    try {
      await this.auth.register({
        username: username.trim(),
        email: email.trim(),
        password,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      await this.router.navigate(['/check-email'], { queryParams: { email: email.trim() } });
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
