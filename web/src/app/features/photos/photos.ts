import { Component, DestroyRef, ElementRef, Injector, OnInit, afterNextRender, inject, viewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardImage } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PhotoService } from '../../shared/services/photo.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FavoriteActions } from '../../shared/services/favorite-actions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Photo } from '../../models/photo.model';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-photos',
  imports: [NgOptimizedImage, RouterLink, MatCard, MatCardImage, MatIconButton, MatIcon, MatProgressSpinner],
  templateUrl: './photos.html',
  styleUrl: './photos.scss',
})
export class Photos implements OnInit {

  private photoService = inject(PhotoService);
  private favorites = inject(FavoritesService);
  private favoriteActions = inject(FavoriteActions);
  private snackBar = inject(MatSnackBar);
  private injector = inject(Injector);
  private scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  photos = this.photoService.photos;
  isLoading = this.photoService.isLoading;
  private observer?: IntersectionObserver;

  constructor() {
    // Load the next page when the anchor below the grid comes within view
    afterNextRender(() => this.watchScroll());
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  ngOnInit(): void {
    // The service keeps the stream, so only load when coming here for the first time
    if (this.photos().length === 0) {
      this.loadMorePhotos();
    }
  }

  isFavorite(photoId: string): boolean {
    return this.favorites.isFavorite(photoId);
  }

  // Saves to the signed-in user's favorites, or asks a visitor to log in
  toggleFavorite(photo: Photo): void {
    this.favoriteActions.toggle(photo);
  }

  async loadMorePhotos(): Promise<void> {
    try {
      await this.photoService.loadNextPage();
    } catch (error) {
      console.error('Failed to load photos', error);
      this.snackBar.open('Failed to load photos.', 'Close', { duration: 2000 });
      return;
    }
    // The observer only reports changes: if the new photos didn't push the anchor off a tall screen,
    // nothing would fire again. Observing it anew reports where it is now.
    afterNextRender(() => this.watchAnchorAgain(), { injector: this.injector });
  }

  private watchScroll(): void {
    const anchor = this.scrollAnchor()?.nativeElement;
    if (!anchor) return;

    this.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !this.isLoading()) {
        this.loadMorePhotos();
      }
    }, { threshold: 0.1 });
    this.observer.observe(anchor);
  }

  private watchAnchorAgain(): void {
    const anchor = this.scrollAnchor()?.nativeElement;
    if (!anchor || !this.observer) return;
    this.observer.unobserve(anchor);
    this.observer.observe(anchor);
  }
}
