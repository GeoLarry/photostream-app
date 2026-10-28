import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardImage } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { PhotoService } from '../../shared/services/photo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Photo } from '../../models/photo.model';

@Component({
  selector: 'app-photos',
  imports: [MatCard, MatCardImage, MatIconButton, MatIcon, MatProgressSpinner],
  templateUrl: './photos.html',
  styleUrl: './photos.scss',
})
export class Photos implements OnInit, AfterViewInit, OnDestroy {

  private photoService = inject(PhotoService)
  private snackBar = inject(MatSnackBar)
  private scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  photos = signal<Photo[]>([]);
  isLoading = signal<boolean>(false);
  private favorites = this.photoService.favorites;
  private observer?: IntersectionObserver;

  ngOnInit() {
    this.loadMorePhotos();
  }

  ngAfterViewInit() {
    this.setUpIntersectionObserver();
  }

  isFavorite(photoId: string): boolean {
    return this.favorites().some(p => p.id === photoId);
  }

  // Toggle favorite photo status
  toggleFavorite(photo: Photo, event: Event) {
    event.stopPropagation(); // Prevents triggering any card click actions
    if (this.isFavorite(photo.id)) {
      this.photoService.removeFromFavorites(photo.id);
      this.snackBar.open('Removed from Favorites!', 'Close', { duration: 2000 })
    } else {
      this.photoService.addToFavorites(photo);
      this.snackBar.open('Added to Favorites! ❤️', 'Close', { duration: 2000 })
    }
  }

  // Load more photos asynchronously from photoService
  async loadMorePhotos(): Promise<void> {
    if (this.isLoading()) return; // Prevent duplicate API requests

    this.isLoading.set(true);
    try {
      const newPhotos = await this.photoService.getRandomPhotos(15);
      this.photos.update(current => [...current, ...newPhotos]); //Append using signals updte
    } catch (error) {
      console.error('Failed to load photos', error);
      this.snackBar.open('Failed to load photos.', 'Close', { duration: 2000 })
    } finally {
      this.isLoading.set(false);
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
