import { Component, computed, effect, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PhotoService } from '../../shared/services/photo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgOptimizedImage } from '@angular/common';
import { Photo } from '../../models/photo.model';
import { scaledHeight } from '../../shared/images/picsum-loader';

@Component({
  selector: 'app-photo-details',
  imports: [NgOptimizedImage, MatButton, MatIcon],
  templateUrl: './photo-details.html',
  styleUrl: './photo-details.scss',
})
export class PhotoDetails {

  // Modern dependency injection
  private router = inject(Router);
  private photoService = inject(PhotoService);
  private snackBar = inject(MatSnackBar)

  // Signal Input: Automatically bound from the ':id' route parameter
  id = input.required<string>();

  // Computed Signal: Automatically updates if the ID or the favorites array changes
  photo = computed(() => this.photoService.getFavoriteById(this.id()));

  constructor() {
    // Reactive Redirect Effect: If the photo is not found (or gets removed),
    // this effect triggers automatically and redirects the user back to favorites.
    effect(() => {
      if (!this.photo()) {
        this.router.navigate(['/favorites'])
      }
    })
  }

  // Detail image is requested about 1200px wide, keeping the photo's aspect ratio
  imageHeight(photo: Photo): number {
    return scaledHeight(photo, 1200);
  }

  // Remove photo from favorites
  remove() {
    const currentPhoto = this.photo();
    if (currentPhoto) {
      this.photoService.removeFromFavorites(currentPhoto.id);// Removing it will automatically trigger above effect above and redirect us
      this.snackBar.open('Photo removed from Favorites!', 'Close', { duration: 2000 })
    } else {
      this.snackBar.open('Photo not found!', 'Close', { duration: 2000 })
    }
  }

}
