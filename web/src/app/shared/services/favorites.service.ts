import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
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
  private url = `${environment.apiUrl}/api/favorites`;

  private favoritesSignal = signal<Photo[]>([]);
  private isLoadingSignal = signal(false);
  private loadFailedSignal = signal(false);
  favorites = this.favoritesSignal.asReadonly(); // newest first
  isLoading = this.isLoadingSignal.asReadonly();
  loadFailed = this.loadFailedSignal.asReadonly();

  // Photo ids with a request in flight, so a double click cannot send opposite requests
  private pending = new Set<string>();

  constructor() {
    removeLegacyFavorites();

    // Follow the signed-in user: load their favorites, or clear them on sign-out
    effect(() => {
      const userId = this.auth.currentUser()?.id;
      untracked(() => userId === undefined ? this.clear() : this.load());
    });
  }

  isFavorite(id: string): boolean {
    return this.favoritesSignal().some(p => p.id === id);
  }

  getById(id: string): Photo | undefined {
    return this.favoritesSignal().find(p => p.id === id);
  }

  async load(): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (userId === undefined) return;

    this.isLoadingSignal.set(true);
    this.loadFailedSignal.set(false);
    try {
      const favorites = await firstValueFrom(this.http.get<FavoriteResponse[]>(this.url));
      // Ignore a late answer for a user who has signed out (or been replaced) in the meantime
      if (this.auth.currentUser()?.id === userId) this.favoritesSignal.set(favorites.map(toPhoto));
    } catch {
      if (this.auth.currentUser()?.id === userId) this.loadFailedSignal.set(true);
    } finally {
      this.isLoadingSignal.set(false);
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
    this.favoritesSignal.set([]);
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
