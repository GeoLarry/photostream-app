import { Injectable, inject, signal } from '@angular/core';
import { Photo } from '../../models/photo.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PhotoService {

  private http = inject(HttpClient); // Modern Dependency Injection χωρίς constructor

  private favoritesSignal = signal<Photo[]>(this.loadFavorites());  // Signal for favorites state (replaces BehaviorSubject) Initialization direct from localStorage

  favorites = this.favoritesSignal.asReadonly(); // Read-only version of signal to prevent directly manipulation from components
  // Method that returns random photos with a 200-300ms delay
  // Using async/Promise to match Signals control flow
  async getRandomPhotos(count: number): Promise<Photo[]> {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const randomDelay = Math.floor(Math.random() * 101) + 200;

    //Using firstValueFrom to convert http Observable into Promise
    const data = await firstValueFrom(
      this.http.get<Photo[]>(`https://picsum.photos/v2/list?page=${randomPage}&limit=${count}`)
    );

    //Emulate real-world API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(data)
      }, randomDelay);
    })
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

  loadFavorites(): Photo[] {
    const stored = localStorage.getItem('favorites_photos');
    return stored ? JSON.parse(stored) : [];
  }
}
