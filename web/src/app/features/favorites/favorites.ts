import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardImage } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../shared/services/favorites.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-favorites',
  imports: [NgOptimizedImage, RouterLink, MatCard, MatCardImage, MatButton, MatProgressSpinner],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites {
  private favoritesService = inject(FavoritesService);

  favorites = this.favoritesService.favorites;
  isLoading = this.favoritesService.isLoading;
  loadFailed = this.favoritesService.loadFailed;

  retry(): void {
    this.favoritesService.load();
  }
}
