import { Component, computed, inject, input, resource, ChangeDetectionStrategy } from '@angular/core';
import { Location, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PhotoService } from '../../shared/services/photo.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FavoriteActions } from '../../shared/services/favorite-actions';
import { Photo } from '../../models/photo.model';
import { scaledHeight } from '../../shared/images/picsum-loader';

@Component({
  selector: 'app-photo-details',
  imports: [NgOptimizedImage, MatButton, MatIcon, MatProgressSpinner],
  templateUrl: './photo-details.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './photo-details.scss',
})
export class PhotoDetails {

  // Modern dependency injection
  private router = inject(Router);
  private location = inject(Location);
  private photoService = inject(PhotoService);
  private favorites = inject(FavoritesService);
  private favoriteActions = inject(FavoriteActions);

  // Signal Input: Automatically bound from the ':id' route parameter
  id = input.required<string>();

  // Works for any photo: the stored favorite if there is one, otherwise fetched from Picsum
  photo = resource({
    params: () => this.id(),
    loader: ({ params: id }) => this.photoService.getPhoto(id),
  });

  isFavorite = computed(() => this.favorites.isFavorite(this.id()));

  // Detail image is requested about 1200px wide, keeping the photo's aspect ratio
  imageHeight(photo: Photo): number {
    return scaledHeight(photo, 1200);
  }

  // Stays on the page either way, so the user can undo right away
  toggleFavorite(photo: Photo) {
    this.favoriteActions.toggle(photo);
  }

  // Go back within the app; when the page was opened directly, fall back to the photostream
  goBack() {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}
