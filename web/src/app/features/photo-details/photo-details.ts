import { Component, computed, inject, input, resource } from '@angular/core';
import { Location, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PhotoService } from '../../shared/services/photo.service';
import { Photo } from '../../models/photo.model';
import { scaledHeight } from '../../shared/images/picsum-loader';

@Component({
  selector: 'app-photo-details',
  imports: [NgOptimizedImage, MatButton, MatIcon, MatProgressSpinner],
  templateUrl: './photo-details.html',
  styleUrl: './photo-details.scss',
})
export class PhotoDetails {

  // Modern dependency injection
  private router = inject(Router);
  private location = inject(Location);
  private photoService = inject(PhotoService);
  private snackBar = inject(MatSnackBar);

  // Signal Input: Automatically bound from the ':id' route parameter
  id = input.required<string>();

  // Works for any photo: the stored favorite if there is one, otherwise fetched from Picsum
  photo = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.photoService.getPhoto(id),
  });

  isFavorite = computed(() => this.photoService.isFavorite(this.id()));

  // Detail image is requested about 1200px wide, keeping the photo's aspect ratio
  imageHeight(photo: Photo): number {
    return scaledHeight(photo, 1200);
  }

  // Stays on the page either way, so the user can undo right away
  toggleFavorite(photo: Photo) {
    const added = this.photoService.toggleFavorite(photo);
    this.snackBar.open(added ? 'Added to Favorites! ❤️' : 'Removed from Favorites!', 'Close', { duration: 2000 })
  }

  // Go back within the app; when the page was opened directly, fall back to the photostream
  goBack() {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
