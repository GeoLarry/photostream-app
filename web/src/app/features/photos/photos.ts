import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
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
export class Photos implements OnInit, AfterViewInit, OnDestroy {

  private photoService = inject(PhotoService)
  private favorites = inject(FavoritesService)
  private favoriteActions = inject(FavoriteActions)
  private snackBar = inject(MatSnackBar)
  private scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  photos = this.photoService.photos;
  isLoading = this.photoService.isLoading;
  private observer?: IntersectionObserver;

  ngOnInit() {
    // The service keeps the stream, so only load when coming here for the first time
    if (this.photos().length === 0) {
      this.loadMorePhotos();
    }
  }

  ngAfterViewInit() {
    this.setUpIntersectionObserver();
  }

  isFavorite(photoId: string): boolean {
    return this.favorites.isFavorite(photoId);
  }

  // Saves to the signed-in user's favorites, or asks a visitor to log in
  toggleFavorite(photo: Photo) {
    this.favoriteActions.toggle(photo);
  }

  // Load more photos asynchronously from photoService
  async loadMorePhotos(): Promise<void> {
    try {
      await this.photoService.loadNextPage();
    } catch (error) {
      console.error('Failed to load photos', error);
      this.snackBar.open('Failed to load photos.', 'Close', { duration: 2000 })
    }
  }

  // Custom Infinite Scroll Logic using IntersectionObserver
  private setUpIntersectionObserver() {
    const anchor = this.scrollAnchor();
    if (!anchor) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !this.isLoading()) { // Fetch more photos when anchor becomes visible and we aren't currently loading
        this.loadMorePhotos();
      }
    },
      {
        root: null, // Watches browser viewport
        threshold: 0.1 // Triggers when 10% of the element is visible
      });
    this.observer.observe(anchor.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

}
