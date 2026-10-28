import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Photo } from '../../models/photo.model';
import { FavoritesService } from './favorites.service';

// The heart button's behavior, shared by the photostream and the photo page:
// toggle the favorite and tell the user what happened (or that they need to log in).
@Injectable({
  providedIn: 'root',
})
export class FavoriteActions {

  private favorites = inject(FavoritesService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  async toggle(photo: Photo): Promise<void> {
    try {
      const result = await this.favorites.toggle(photo);
      if (result === 'added') this.snackBar.open('Added to Favorites! ❤️', 'Close', { duration: 2000 });
      if (result === 'removed') this.snackBar.open('Removed from Favorites!', 'Close', { duration: 2000 });
      if (result === 'login-required') this.askToLogIn();
    } catch {
      this.snackBar.open("Couldn't update your favorites. Please try again.", 'Close', { duration: 4000 });
    }
  }

  private askToLogIn(): void {
    const returnUrl = this.router.url;
    this.snackBar
      .open('Log in to save favorites', 'Log in', { duration: 5000 })
      .onAction()
      .subscribe(() => this.router.navigate(['/login'], { queryParams: { returnUrl } }));
  }
}
