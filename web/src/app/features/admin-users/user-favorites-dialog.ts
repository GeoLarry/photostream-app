import { Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AdminUsersService } from '../../shared/services/admin-users.service';
import { UserSummary } from '../../models/user.model';

// An admin's read-only look at one user's favorites.
@Component({
  selector: 'app-user-favorites-dialog',
  imports: [NgOptimizedImage, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, MatProgressSpinner],
  template: `
    <h2 mat-dialog-title>Favorites of {{ user.username }}</h2>
    <mat-dialog-content>
      @if (favorites.isLoading()) {
        <mat-spinner diameter="40" aria-label="Loading favorites"></mat-spinner>
      } @else if (favorites.error()) {
        <p role="alert">We couldn't load the favorites.</p>
      } @else {
        <div class="thumbs">
          @for (photo of favorites.value(); track photo.id) {
            <figure>
              <!-- Twice the thumbnail width, so it stays sharp when the grid stretches it and on retina screens -->
              <img [ngSrc]="photo.id" width="320" height="214" [loaderParams]="{ width: 320, height: 214 }" [alt]="photo.author" />
              <figcaption>{{ photo.author }}</figcaption>
            </figure>
          } @empty {
            <p>No favorites yet.</p>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { display: block; width: 100%; height: auto; border-radius: 8px; }
    figcaption { font-size: 12px; margin-top: 4px; color: var(--mat-sys-on-surface-variant); }
    mat-spinner { margin: 24px auto; }
  `,
})
export class UserFavoritesDialog {

  private admin = inject(AdminUsersService);
  user = inject<UserSummary>(MAT_DIALOG_DATA);

  favorites = this.admin.favoritesOf(this.user);
}
