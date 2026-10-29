import { Injectable, inject, signal } from '@angular/core';
import { Photo } from '../../models/photo.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FavoritesService } from './favorites.service';

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

  private http = inject(HttpClient);
  private favorites = inject(FavoritesService);

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

  // Any photo by id: the saved favorite if there is one, otherwise ask Picsum
  async getPhoto(id: string): Promise<Photo> {
    const favorite = this.favorites.getById(id);
    if (favorite) return favorite;
    return firstValueFrom(this.http.get<Photo>(`https://picsum.photos/id/${encodeURIComponent(id)}/info`));
  }
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function simulateDelay(): Promise<void> {
  const { min, max } = SIMULATED_API_DELAY_MS;
  return new Promise(resolve => setTimeout(resolve, randomInt(min, max)));
}
