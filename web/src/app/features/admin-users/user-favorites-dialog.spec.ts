import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IMAGE_LOADER } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserFavoritesDialog } from './user-favorites-dialog';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { API_URL } from '../../shared/http/api-url';
import { FavoriteResponse } from '../../models/favorite.model';

describe('UserFavoritesDialog', () => {
  let fixture: ComponentFixture<UserFavoritesDialog>;
  let httpMock: HttpTestingController;

  const favoritesUrl = `${API_URL}/users/2/favorites`;
  const favorite: FavoriteResponse = {
    photoId: '10', author: 'Alejandro Escamilla', width: 5000, height: 3333,
    url: 'https://unsplash.com/photos/10', downloadUrl: 'https://picsum.photos/id/10/5000/3333',
    createdAtUtc: '2026-10-28T10:00:00Z',
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFavoritesDialog],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { id: 2, username: 'maria' } },
        { provide: IMAGE_LOADER, useValue: picsumLoader },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UserFavoritesDialog);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  async function answer(body: FavoriteResponse[] | null, options?: { status: number; statusText: string }) {
    httpMock.expectOne(favoritesUrl).flush(body, options);
    await fixture.whenStable();
  }

  it("shows the user's favorites", async () => {
    await answer([favorite]);

    expect(text()).toContain('Favorites of maria');
    expect(text()).toContain('Alejandro Escamilla');
  });

  it('says when there are none', async () => {
    await answer([]);
    expect(text()).toContain('No favorites yet.');
  });

  it('says when they could not be loaded', async () => {
    await answer(null, { status: 500, statusText: 'Server Error' });
    expect(text()).toContain("couldn't load the favorites");
  });

  it('cancels the request when the dialog closes', () => {
    const request = httpMock.expectOne(favoritesUrl);

    fixture.destroy();

    expect(request.cancelled).toBe(true);
  });
});
