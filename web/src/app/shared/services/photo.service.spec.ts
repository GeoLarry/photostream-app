import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PhotoService } from './photo.service';
import { Photo } from '../../models/photo.model';
import { FavoritesService } from './favorites.service';
import { FakeFavoritesService } from '../testing/fake-favorites.service';

describe('PhotoService', () => {
  let service: PhotoService;
  let httpMock: HttpTestingController;
  let favorites: FakeFavoritesService;

  // Mock photo data to use across multiple tests
  const mockPhoto: Photo = {
    id: '101',
    download_url: 'https://picsum.photos/id/101/200/300',
    height: 300,
    width: 200,
    url: 'https://picsum.photos/id/101',
    author: 'John Doe'
  };

  beforeEach(() => {
    favorites = new FakeFavoritesService();
    TestBed.configureTestingModule({
      providers: [
        PhotoService,
        { provide: FavoritesService, useValue: favorites },
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional testing HTTP client provider
      ]
    });

    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that no mismatched or outstanding HTTP requests remain open
    httpMock.verify();
  });

  // Test 1: Verifies that the service instantiates correctly
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('photostream paging', () => {
    const photo = (id: string): Photo => ({ ...mockPhoto, id });
    const listUrl = (page: number) => `https://picsum.photos/v2/list?page=${page}&limit=15`;
    // Let pending promise callbacks run so the next request is issued
    const settle = () => new Promise(resolve => setTimeout(resolve));

    beforeEach(() => {
      // Start page = 1 + floor(0.5 * 30) = 16
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    it('should start on a random page and then load pages sequentially', async () => {
      let loading = service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1'), photo('2')]);
      await loading;

      loading = service.loadNextPage();
      httpMock.expectOne(listUrl(17)).flush([photo('3')]);
      await loading;

      expect(service.photos().map(p => p.id)).toEqual(['1', '2', '3']);
    });

    it('should skip photos that are already loaded', async () => {
      let loading = service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1'), photo('2'), photo('2')]);
      await loading;

      loading = service.loadNextPage();
      httpMock.expectOne(listUrl(17)).flush([photo('2'), photo('3')]);
      await loading;

      expect(service.photos().map(p => p.id)).toEqual(['1', '2', '3']);
    });

    it('should wrap around to page 1 when a page comes back empty', async () => {
      let loading = service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([]);
      await settle();
      httpMock.expectOne(listUrl(1)).flush([photo('1')]);
      await loading;

      loading = service.loadNextPage();
      httpMock.expectOne(listUrl(2)).flush([photo('2')]);
      await loading;

      expect(service.photos().map(p => p.id)).toEqual(['1', '2']);
    });

    it('should ignore a second call while a page is loading', async () => {
      const loading = service.loadNextPage();
      service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1')]);
      await loading;
      expect(service.isLoading()).toBe(false);
    });
  });

  it('should return a saved favorite from getPhoto without calling Picsum', async () => {
    favorites.list.set([mockPhoto]);
    expect(await service.getPhoto('101')).toEqual(mockPhoto);
    httpMock.expectNone('https://picsum.photos/id/101/info');
  });

  it('should fetch a non-favorite photo from the Picsum info endpoint', async () => {
    const loading = service.getPhoto('101');
    httpMock.expectOne('https://picsum.photos/id/101/info').flush(mockPhoto);
    expect(await loading).toEqual(mockPhoto);
  });
});
