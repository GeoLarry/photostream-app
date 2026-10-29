import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photos } from './photos';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FakeFavoritesService } from '../../shared/testing/fake-favorites.service';
import { Photo } from '../../models/photo.model';
import { IMAGE_LOADER } from '@angular/common';
import { provideRouter } from '@angular/router';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { EMPTY } from 'rxjs';

describe('Photos', () => {
  let component: Photos;
  let fixture: ComponentFixture<Photos>;
  let favorites: FakeFavoritesService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    favorites = new FakeFavoritesService();
    // A real snackbar keeps a timer running that whenStable() would wait for
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue({ onAction: () => EMPTY } as unknown as MatSnackBarRef<TextOnlySnackBar>);
    await TestBed.configureTestingModule({
      imports: [Photos],
      providers: [
        PhotoService,
        { provide: FavoritesService, useValue: favorites },
        { provide: MatSnackBar, useValue: snackBar },
        provideHttpClient(),
        provideHttpClientTesting(), // Modern functional testing HTTP client provider
        { provide: IMAGE_LOADER, useValue: picsumLoader },
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Photos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the first photostream page on init', () => {
    const httpMock = TestBed.inject(HttpTestingController);
    const req = httpMock.expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'));
    expect(req.request.method).toBe('GET');
  });

  describe('with a loaded photo', () => {
    const photo: Photo = {
      id: '101',
      download_url: 'https://picsum.photos/id/101/5000/3333',
      width: 5000,
      height: 3333,
      url: 'https://unsplash.com/photos/abc',
      author: 'John Doe'
    };

    beforeEach(async () => {
      TestBed.inject(HttpTestingController)
        .expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'))
        .flush([photo]);
      // Wait out the simulated API delay (at most 300 ms)
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();
    });

    it('should link the card to the photo detail page', () => {
      const link = fixture.nativeElement.querySelector('.card-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/photos/101');
      expect(link.getAttribute('aria-label')).toBe('View photo by John Doe');
    });

    it('should give the favorite button a state-aware accessible name', async () => {
      const button = () => fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;
      expect(button().getAttribute('aria-label')).toBe('Add to favorites');
      expect(button().getAttribute('aria-pressed')).toBe('false');

      button().click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(button().getAttribute('aria-label')).toBe('Remove from favorites');
      expect(button().getAttribute('aria-pressed')).toBe('true');
    });

    it('should leave the photo unsaved for a visitor', async () => {
      favorites.signedIn = false;
      const button = () => fixture.nativeElement.querySelector('.fav-btn') as HTMLButtonElement;

      button().click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(button().getAttribute('aria-pressed')).toBe('false');
      expect(snackBar.open).toHaveBeenCalledWith('Log in to save favorites', 'Log in', jasmine.any(Object));
    });
  });
});
