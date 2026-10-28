import { Injectable, inject, signal } from '@angular/core';
import { Photo } from '../../models/photo.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// The original brief asks for a simulated API delay of 200-300 ms, so the loading states
// (spinner, infinite scroll guard) are visible even when Picsum answers instantly.
const SIMULATED_API_DELAY_MS = { min: 200, max: 300 };
const PAGE_SIZE = 15;
// The photostream starts on a random page so every visit looks different
const MAX_START_PAGE = 30;

@Injectable({
  providedIn: 'root',
})
export class PhotoService {

  private http = inject(HttpClient); // Modern Dependency Injection χωρίς constructor

  private favoritesSignal = signal<Photo[]>(this.loadFavorites());  // Signal for favorites state (replaces BehaviorSubject) Initialization direct from localStorage

  favorites = this.favoritesSignal.asReadonly(); // Read-only version of signal to prevent directly manipulation from components

  // Photostream state lives here so it survives navigating to a photo and back
  private photosSignal = signal<Photo[]>([]);
  private isLoadingSignal = signal(false);
  photos = this.photosSignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();

  private nextPage: number | null = null;
  private loadedIds = new Set<string>();

  // Load the next page of the photostream: random start page once, then sequential pages.
  // An empty page means we ran past the end of the list, so wrap around to page 1.
  async loadNextPage(): Promise<void> {
    if (this.isLoadingSignal()) return; // Prevent duplicate API requests

    this.isLoadingSignal.set(true);
    try {
      let page = this.nextPage ?? randomInt(1, MAX_START_PAGE);
      let data = await this.fetchPage(page);
      if (data.length === 0 && page !== 1) {
        page = 1;
        data = await this.fetchPage(page);
      }
      this.nextPage = page + 1;

      const fresh: Photo[] = [];
      for (const photo of data) {
        if (!this.loadedIds.has(photo.id)) {
          this.loadedIds.add(photo.id);
          fresh.push(photo);
        }
      }

      await simulateDelay();
      this.photosSignal.update(current => [...current, ...fresh]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  private fetchPage(page: number): Promise<Photo[]> {
    return firstValueFrom(
      this.http.get<Photo[]>(`https://picsum.photos/v2/list?page=${page}&limit=${PAGE_SIZE}`)
    );
  }

  //Find photo by id
  getFavoriteById(id: string): Photo | undefined {
    return this.favoritesSignal().find(p => p.id === id);
  }

  //Add to favorites
  addToFavorites(photo: Photo) {
    if (!this.favoritesSignal().some(p => p.id === photo.id)) { // Check if already in favorites
      this.favoritesSignal.update(current => { // Update current 
        const updated = [...current, photo];
        this.saveFavorites(updated);
        return updated;
      })
    }
  }

  //Remove photo from favorites
  removeFromFavorites(photoId: string) {
    this.favoritesSignal.update(current => {
      const updated = current.filter(p => p.id !== photoId);
      this.saveFavorites(updated);
      return updated;
    })
  }

  saveFavorites(favorites: Photo[]) {
    localStorage.setItem('favorites_photos', JSON.stringify(favorites));
  }

  // Stored data may be corrupt or from an older version, so drop anything that is not a Photo
  loadFavorites(): Photo[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem('favorites_photos') ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isPhoto) : [];
    } catch {
      return [];
    }
  }
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function simulateDelay(): Promise<void> {
  const { min, max } = SIMULATED_API_DELAY_MS;
  return new Promise(resolve => setTimeout(resolve, randomInt(min, max)));
}

function isPhoto(value: unknown): value is Photo {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return typeof p['id'] === 'string'
    && typeof p['author'] === 'string'
    && typeof p['url'] === 'string'
    && typeof p['download_url'] === 'string'
    && typeof p['width'] === 'number'
    && typeof p['height'] === 'number';
}
