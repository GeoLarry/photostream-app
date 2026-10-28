import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Favorites } from './favorites';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';
import { IMAGE_LOADER } from '@angular/common';
import { provideRouter } from '@angular/router';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { Photo } from '../../models/photo.model';

describe('Favorites', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;

  const photo: Photo = {
    id: '101',
    download_url: 'https://picsum.photos/id/101/5000/3333',
    width: 5000,
    height: 3333,
    url: 'https://unsplash.com/photos/abc',
    author: 'John Doe'
  };

  beforeEach(async () => {
    localStorage.clear(); // PhotoService reads favorites on creation
    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting(), // Modern functional testing HTTP client provider
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: picsumLoader }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty state without favorites', () => {
    expect(fixture.nativeElement.textContent).toContain('Your Favorites is empty');
  });

  it('should link each favorite to its detail page', () => {
    TestBed.inject(PhotoService).addToFavorites(photo);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.card-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/photos/101');
  });
});
