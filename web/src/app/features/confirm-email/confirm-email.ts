import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../shared/services/auth.service';
import { apiErrorMessage } from '../../shared/http/api-error';

// Opened from the link in the confirmation email: /confirm-email?token=...
@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, MatCard, MatButton, MatProgressSpinner],
  templateUrl: './confirm-email.html',
})
export class ConfirmEmail implements OnInit {

  private auth = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  token = input<string>();

  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const token = this.token();
    if (!token) {
      this.error.set('This link is incomplete. Open the link from the email again, or ask for a new one.');
      return;
    }

    try {
      await this.auth.confirmEmail(token);
      this.snackBar.open('Email confirmed. Welcome to Photostream!', 'Close', { duration: 4000 });
      await this.router.navigateByUrl('/', { replaceUrl: true }); // keep the used token out of the history
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }
}
