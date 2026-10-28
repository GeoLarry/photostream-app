import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Favorites } from './favorites';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FakeFavoritesService } from '../../shared/testing/fake-favorites.service';
import { IMAGE_LOADER } from '@angular/common';
import { provideRouter } from '@angular/router';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { Photo } from '../../models/photo.model';

describe('Favorites', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;
  let favorites: FakeFavoritesService;

  const photo: Photo = {
    id: '101',
    download_url: 'https://picsum.photos/id/101/5000/3333',
    width: 5000,
    height: 3333,
    url: 'https://unsplash.com/photos/abc',
    author: 'John Doe'
  };

  beforeEach(async () => {
    favorites = new FakeFavoritesService();
    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        { provide: FavoritesService, useValue: favorites },
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: picsumLoader }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty state without favorites', () => {
    expect(fixture.nativeElement.textContent).toContain('Your Favorites is empty');
  });

  it('should link each favorite to its detail page', () => {
    favorites.list.set([photo]);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.card-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/photos/101');
  });

  it('should show a spinner while the first load is running', () => {
    favorites.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Your Favorites is empty');
  });

  it('should offer a retry when loading failed', () => {
    favorites.failed.set(true);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("couldn't load your favorites");
    (alert.querySelector('button') as HTMLButtonElement).click();
    expect(favorites.loadCalls).toBe(1);
  });
});
