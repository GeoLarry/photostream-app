import { TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FavoritesService } from './favorites.service';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../models/auth.model';
import { FavoriteResponse } from '../../models/favorite.model';
import { Photo } from '../../models/photo.model';
import { API_URL } from '../http/api-url';

describe('FavoritesService', () => {
  const url = `${API_URL}/favorites`;
  const user = (id: number): CurrentUser => ({ id, username: `u${id}`, email: `u${id}@example.com`, firstName: null, lastName: null, roles: [], permissions: [] });
  const photo = (id: string): Photo => ({
    id, author: 'John Doe', width: 5000, height: 3333,
    url: `https://unsplash.com/photos/${id}`, download_url: `https://picsum.photos/id/${id}/5000/3333`,
  });
  const response = (id: string): FavoriteResponse => ({
    photoId: id, author: 'John Doe', width: 5000, height: 3333,
    url: `https://unsplash.com/photos/${id}`, downloadUrl: `https://picsum.photos/id/${id}/5000/3333`,
    createdAtUtc: '2026-10-28T10:00:00Z',
  });

  const currentUser = signal<CurrentUser | null>(null);
  let service: FavoritesService;
  let httpMock: HttpTestingController;

  // Signs a user in and answers the favorites request the service then makes
  async function signIn(id: number, favorites: FavoriteResponse[] = []) {
    currentUser.set(user(id));
    TestBed.tick(); // runs the effect that follows the signed-in user
    httpMock.expectOne(url).flush(favorites);
    await Promise.resolve();
  }

  beforeEach(() => {
    currentUser.set(null);
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser, isAuthenticated: computed(() => currentUser() !== null) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const create = () => {
    service = TestBed.inject(FavoritesService);
    TestBed.tick();
  };

  it('removes favorites left in localStorage by the old version', () => {
    localStorage.setItem('favorites_photos', '[]');
    create();
    expect(localStorage.getItem('favorites_photos')).toBeNull();
  });

  it('asks the API for nothing while signed out', () => {
    create();
    httpMock.expectNone(url);
    expect(service.favorites()).toEqual([]);
  });

  it('loads the favorites when a user signs in, as photos', async () => {
    create();
    await signIn(1, [response('10'), response('20')]);

    expect(service.favorites().map(p => p.id)).toEqual(['10', '20']);
    expect(service.getById('10')).toEqual(photo('10'));
    expect(service.isFavorite('20')).toBe(true);
  });

  it('clears the favorites when the user signs out', async () => {
    create();
    await signIn(1, [response('10')]);

    currentUser.set(null);
    TestBed.tick();

    expect(service.favorites()).toEqual([]);
  });

  it('ignores a late answer for a user who already signed out', async () => {
    create();
    currentUser.set(user(1));
    TestBed.tick();
    const request = httpMock.expectOne(url);

    currentUser.set(null);
    TestBed.tick();
    request.flush([response('10')]);
    await Promise.resolve();

    expect(service.favorites()).toEqual([]);
  });

  it('does not reload when the signed-in user is only refreshed', async () => {
    create();
    await signIn(1, [response('10')]);

    currentUser.set({ ...user(1), firstName: 'John' });
    TestBed.tick();

    httpMock.expectNone(url);
    expect(service.favorites().length).toBe(1);
  });

  it('keeps loading for the next user when the previous user\'s answer arrives late', async () => {
    create();
    currentUser.set(user(1));
    TestBed.tick();
    currentUser.set(user(2));
    TestBed.tick();
    const [first, second] = httpMock.match(url);

    first.flush([response('10')]);
    await Promise.resolve();
    expect(service.isLoading()).toBe(true);
    expect(service.favorites()).toEqual([]);

    second.flush([response('20')]);
    await Promise.resolve();
    expect(service.isLoading()).toBe(false);
    expect(service.favorites().map(p => p.id)).toEqual(['20']);
  });

  it('stops loading when the user signs out', () => {
    create();
    currentUser.set(user(1));
    TestBed.tick();
    const request = httpMock.expectOne(url);
    expect(service.isLoading()).toBe(true);

    currentUser.set(null);
    TestBed.tick();

    expect(service.isLoading()).toBe(false);
    request.flush([]);
  });

  it('reports a failed load and can retry', async () => {
    create();
    currentUser.set(user(1));
    TestBed.tick();
    httpMock.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    await Promise.resolve();
    expect(service.loadFailed()).toBe(true);

    const retry = service.load();
    httpMock.expectOne(url).flush([response('10')]);
    await retry;

    expect(service.loadFailed()).toBe(false);
    expect(service.favorites().length).toBe(1);
  });

  it('asks a visitor to log in instead of calling the API', async () => {
    create();
    expect(await service.toggle(photo('10'))).toBe('login-required');
  });

  it('adds a favorite right away and saves it with its details', async () => {
    create();
    await signIn(1);

    const toggling = service.toggle(photo('10'));
    expect(service.isFavorite('10')).toBe(true); // before the API answers

    const req = httpMock.expectOne(`${url}/10`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      author: 'John Doe', width: 5000, height: 3333,
      url: 'https://unsplash.com/photos/10', downloadUrl: 'https://picsum.photos/id/10/5000/3333',
    });
    req.flush(response('10'));

    expect(await toggling).toBe('added');
  });

  it('puts the list back when saving fails', async () => {
    create();
    await signIn(1, [response('20')]);

    const toggling = service.toggle(photo('10'));
    httpMock.expectOne(`${url}/10`).flush(null, { status: 500, statusText: 'Server Error' });

    await expect(toggling).rejects.toThrow();
    expect(service.favorites().map(p => p.id)).toEqual(['20']);
  });

  it('removes a favorite, and treats "already gone" as removed', async () => {
    create();
    await signIn(1, [response('10'), response('20')]);

    const first = service.toggle(photo('10'));
    expect(service.isFavorite('10')).toBe(false);
    const req = httpMock.expectOne(`${url}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(await first).toBe('removed');

    const second = service.toggle(photo('20'));
    httpMock.expectOne(`${url}/20`).flush({ message: 'Favorite not found.' }, { status: 404, statusText: 'Not Found' });
    expect(await second).toBe('removed');
    expect(service.favorites()).toEqual([]);
  });

  it('restores a favorite when removing it fails', async () => {
    create();
    await signIn(1, [response('10')]);

    const toggling = service.toggle(photo('10'));
    httpMock.expectOne(`${url}/10`).flush(null, { status: 500, statusText: 'Server Error' });

    await expect(toggling).rejects.toThrow();
    expect(service.isFavorite('10')).toBe(true);
  });

  it('ignores a second click while the first is still saving', async () => {
    create();
    await signIn(1);

    const first = service.toggle(photo('10'));
    expect(await service.toggle(photo('10'))).toBe('busy');

    httpMock.expectOne(`${url}/10`).flush(response('10'));
    expect(await first).toBe('added');
    expect(service.isFavorite('10')).toBe(true);
  });
});
