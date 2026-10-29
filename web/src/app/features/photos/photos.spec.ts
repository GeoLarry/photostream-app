import type { MockOf } from '../../shared/testing/mock-of';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photos } from './photos';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FakeFavoritesService } from '../../shared/testing/fake-favorites.service';
import { FakeIntersectionObserver } from '../../shared/testing/fake-intersection-observer';
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
  let snackBar: MockOf<MatSnackBar, 'open'>;

  beforeEach(async () => {
    // The infinite scroll watches an anchor below the grid; jsdom has no IntersectionObserver
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    favorites = new FakeFavoritesService();
    // A real snackbar keeps a timer running that whenStable() would wait for
    snackBar = {
      open: vi.fn().mockName('MatSnackBar.open')
    };
    snackBar.open.mockReturnValue({ onAction: () => EMPTY } as unknown as MatSnackBarRef<TextOnlySnackBar>);
    await TestBed.configureTestingModule({
      imports: [Photos],
      providers: [
        PhotoService,
        { provide: FavoritesService, useValue: favorites },
        { provide: MatSnackBar, useValue: snackBar },
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IMAGE_LOADER, useValue: picsumLoader },
        provideRouter([])
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Photos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.unstubAllGlobals());

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

    let firstPageUrl: string;
    const pageOf = (url: string) => Number(new URL(url).searchParams.get('page'));

    beforeEach(async () => {
      const first = TestBed.inject(HttpTestingController)
        .expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'));
      firstPageUrl = first.request.url;
      first.flush([photo]);
      // Wait out the simulated API delay (at most 300 ms)
      await new Promise(resolve => setTimeout(resolve, 350));
      fixture.detectChanges();
    });

    it('should load the next page when the bottom of the grid scrolls into view', () => {
      FakeIntersectionObserver.latest!.enter();

      const next = TestBed.inject(HttpTestingController)
        .expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'));
      expect(pageOf(next.request.url)).toBe(pageOf(firstPageUrl) + 1);
    });

    it('should keep loading while the bottom of the grid stays in view', async () => {
      const httpMock = TestBed.inject(HttpTestingController);
      FakeIntersectionObserver.latest!.enter();
      const second = httpMock.expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'));
      second.flush([{ ...photo, id: '102' }]);
      await new Promise(resolve => setTimeout(resolve, 350));
      await fixture.whenStable();

      const third = httpMock.expectOne(req => req.url.startsWith('https://picsum.photos/v2/list'));
      expect(pageOf(third.request.url)).toBe(pageOf(second.request.url) + 1);
    });

    it('should stop loading once the bottom of the grid is out of view', async () => {
      const httpMock = TestBed.inject(HttpTestingController);
      const observer = FakeIntersectionObserver.latest!;
      observer.enter();
      observer.leave();
      httpMock.expectOne(req => req.url.startsWith('https://picsum.photos/v2/list')).flush([{ ...photo, id: '102' }]);
      await new Promise(resolve => setTimeout(resolve, 350));
      await fixture.whenStable();

      httpMock.expectNone(req => req.url.startsWith('https://picsum.photos/v2/list'));
    });

    it('should stop watching the scroll when the page is left', () => {
      const observer = FakeIntersectionObserver.latest!;
      expect(observer.observed.length).toBe(1);

      fixture.destroy();

      expect(observer.disconnected).toBe(true);
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
      expect(snackBar.open).toHaveBeenCalledWith('Log in to save favorites', 'Log in', expect.any(Object));
    });
  });
});
