import { Injectable, signal } from '@angular/core';
import { Photo } from '../../models/photo.model';
import { FavoritesService, ToggleResult } from '../services/favorites.service';

// In-memory stand-in for FavoritesService in component specs: no API, no sign-in.
@Injectable()
export class FakeFavoritesService implements Pick<FavoritesService,
  'favorites' | 'isLoading' | 'loadFailed' | 'isFavorite' | 'getById' | 'load' | 'toggle'> {

  readonly list = signal<Photo[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  signedIn = true;

  favorites = this.list.asReadonly();
  isLoading = this.loading.asReadonly();
  loadFailed = this.failed.asReadonly();
  loadCalls = 0;

  async load(): Promise<void> {
    this.loadCalls++;
  }

  isFavorite(id: string): boolean {
    return this.list().some(p => p.id === id);
  }

  getById(id: string): Photo | undefined {
    return this.list().find(p => p.id === id);
  }

  async toggle(photo: Photo): Promise<ToggleResult> {
    if (!this.signedIn) return 'login-required';
    if (this.isFavorite(photo.id)) {
      this.list.update(list => list.filter(p => p.id !== photo.id));
      return 'removed';
    }
    this.list.update(list => [photo, ...list]);
    return 'added';
  }
}
