import { Component, DestroyRef, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AuthService } from '../../shared/services/auth.service';
import { apiErrorMessage } from '../../shared/http/api-error';

// Matches the API's resend cooldown (EmailConfirmation:ResendCooldownSeconds).
export const RESEND_COOLDOWN_SECONDS = 60;

// After sign-up, and from the login page: "check your inbox", with a way to get a new link.
@Component({
  selector: 'app-check-email',
  imports: [ReactiveFormsModule, RouterLink, MatCard, MatFormField, MatLabel, MatInput, MatError, MatButton],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './check-email.html',
})
export class CheckEmail implements OnInit {

  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // ?email=..., set right after sign-up
  email = input<string>();

  emailControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });

  sending = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  cooldown = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const email = this.email();
    if (email) {
      this.emailControl.setValue(email);
      // A link was just sent with the sign-up, so a new one would be skipped by the API anyway.
      this.startCooldown();
    }
    this.destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  async resend(): Promise<void> {
    if (this.emailControl.invalid || this.sending() || this.cooldown() > 0) {
      this.emailControl.markAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.message.set(null);
    try {
      this.message.set(await this.auth.resendConfirmation(this.emailControl.value.trim()));
      this.startCooldown();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }

  private startCooldown(): void {
    clearInterval(this.timer);
    this.cooldown.set(RESEND_COOLDOWN_SECONDS);
    this.timer = setInterval(() => {
      this.cooldown.update(seconds => seconds - 1);
      if (this.cooldown() <= 0) clearInterval(this.timer);
    }, 1000);
  }
}
