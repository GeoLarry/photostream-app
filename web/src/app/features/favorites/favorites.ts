import { Component, inject } from '@angular/core';
import { MatCard, MatCardImage } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { PhotoService } from '../../shared/services/photo.service';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-favorites',
  imports: [NgOptimizedImage, RouterLink, MatCard, MatCardImage],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites {
  // Modern dependency injection
  protected photoService = inject(PhotoService);

  // Expose the read-only signal from the service directly to the template
  favorites = this.photoService.favorites;
}
