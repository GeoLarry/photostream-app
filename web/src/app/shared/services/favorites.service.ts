import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../http/api-url';
import { Photo } from '../../models/photo.model';
import { AddFavoriteRequest, FavoriteResponse } from '../../models/favorite.model';
import { AuthService } from './auth.service';

// Where favorites lived before they moved to the API; removed so old data does not linger.
const LEGACY_STORAGE_KEY = 'favorites_photos';

export type ToggleResult = 'added' | 'removed' | 'login-required' | 'busy';

// The signed-in user's favorites, kept on the API. Loaded when someone signs in, cleared when they sign out.
// Changes show up immediately and are rolled back if the API refuses them.
@Injectable({
  providedIn: 'root',
})
export class FavoritesService {

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${API_URL}/favorites`;

  private favoritesSignal = signal<Photo[]>([]);
  private isLoadingSignal = signal(false);
  private loadFailedSignal = signal(false);
  favorites = this.favoritesSignal.asReadonly(); // newest first
  isLoading = this.isLoadingSignal.asReadonly();
  loadFailed = this.loadFailedSignal.asReadonly();

  // Looked up for every card on every render, so a Set rather than a search through the list
  private favoriteIds = computed(() => new Set(this.favoritesSignal().map(p => p.id)));
  // Only a different user (or none) matters, not a new object for the same one
  private userId = computed(() => this.auth.currentUser()?.id);

  // Photo ids with a request in flight, so a double click cannot send opposite requests
  private pending = new Set<string>();
  // Number of the newest load, so an answer for a user who has signed out (or been replaced) is ignored
  private requestId = 0;

  constructor() {
    removeLegacyFavorites();

    // Follow the signed-in user: load their favorites, or clear them on sign-out
    effect(() => {
      const userId = this.userId();
      untracked(() => userId === undefined ? this.clear() : this.load());
    });
  }

  isFavorite(id: string): boolean {
    return this.favoriteIds().has(id);
  }

  getById(id: string): Photo | undefined {
    return this.favoritesSignal().find(p => p.id === id);
  }

  async load(): Promise<void> {
    if (this.userId() === undefined) return;
    const id = ++this.requestId;

    this.isLoadingSignal.set(true);
    this.loadFailedSignal.set(false);
    try {
      const favorites = await firstValueFrom(this.http.get<FavoriteResponse[]>(this.url));
      if (id === this.requestId) this.favoritesSignal.set(favorites.map(toPhoto));
    } catch {
      if (id === this.requestId) this.loadFailedSignal.set(true);
    } finally {
      if (id === this.requestId) this.isLoadingSignal.set(false);
    }
  }

  // Throws when the API refuses the change; the list is then back to what it was.
  async toggle(photo: Photo): Promise<ToggleResult> {
    if (!this.auth.isAuthenticated()) return 'login-required';
    if (this.pending.has(photo.id)) return 'busy';

    this.pending.add(photo.id);
    const before = this.favoritesSignal();
    try {
      if (this.isFavorite(photo.id)) {
        this.favoritesSignal.set(before.filter(p => p.id !== photo.id));
        await this.remove(photo.id);
        return 'removed';
      }
      this.favoritesSignal.set([photo, ...before]);
      await firstValueFrom(this.http.put<FavoriteResponse>(this.photoUrl(photo.id), toRequest(photo)));
      return 'added';
    } catch (error) {
      this.favoritesSignal.set(before);
      throw error;
    } finally {
      this.pending.delete(photo.id);
    }
  }

  private async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(this.photoUrl(id)));
    } catch (error) {
      // Already gone on the server (e.g. removed in another tab): that is the state we wanted
      if (!(error instanceof HttpErrorResponse && error.status === 404)) throw error;
    }
  }

  private clear(): void {
    this.requestId++; // a load still in flight is for the previous user
    this.favoritesSignal.set([]);
    this.isLoadingSignal.set(false);
    this.loadFailedSignal.set(false);
  }

  private photoUrl(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}

export function toPhoto(favorite: FavoriteResponse): Photo {
  return {
    id: favorite.photoId,
    author: favorite.author,
    width: favorite.width,
    height: favorite.height,
    url: favorite.url,
    download_url: favorite.downloadUrl,
  };
}

function toRequest(photo: Photo): AddFavoriteRequest {
  return {
    author: photo.author,
    width: photo.width,
    height: photo.height,
    url: photo.url,
    downloadUrl: photo.download_url,
  };
}

function removeLegacyFavorites(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing to clean up
  }
}
