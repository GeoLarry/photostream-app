import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PhotoService } from './photo.service';
import { Photo } from '../../models/photo.model';

describe('PhotoService', () => {
  let service: PhotoService;
  let httpMock: HttpTestingController;

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
    // Clear localStorage before the service reads it, to guarantee an isolated state
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional testing HTTP client provider
      ]
    });

    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
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
      spyOn(Math, 'random').and.returnValue(0.5);
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
      expect(service.isLoading()).toBeFalse();
    });
  });

  // Test 3: Verifies managing favorite list reactively and local storage synchronization using Signals
  it('should add a photo to favorites and update localStorage', () => {
    service.addToFavorites(mockPhoto);

    // Assert Signal value directly by calling it as a function
    const currentFavorites = service.favorites();
    expect(currentFavorites.length).toBe(1);
    expect(currentFavorites[0].id).toBe('101');

    // Assert LocalStorage persistence works
    const stored = localStorage.getItem('favorites_photos');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!)[0].id).toBe('101');
  });

  // Test 4: Verifies removal mechanism from favorites array using Signals
  it('should remove a photo from favorites', () => {
    // Arrange state with one favorited item
    service.addToFavorites(mockPhoto);
    
    // Act
    service.removeFromFavorites('101');

    // Assert using the synchronous read of the Signal
    expect(service.favorites().length).toBe(0);
  });

  // Test 5: Verifies fetching a singular photo by its unique ID
  it('should find and return a specific favorite photo by its id', () => {
    service.addToFavorites(mockPhoto);

    const foundPhoto = service.getFavoriteById('101');
    expect(foundPhoto).toBeDefined();
    expect(foundPhoto?.author).toBe('John Doe');

    const notFoundPhoto = service.getFavoriteById('999');
    expect(notFoundPhoto).toBeUndefined();
  });

  it('should return a favorite from getPhoto without calling the API', async () => {
    service.addToFavorites(mockPhoto);
    expect(await service.getPhoto('101')).toEqual(mockPhoto);
    httpMock.expectNone('https://picsum.photos/id/101/info');
  });

  it('should fetch a non-favorite photo from the Picsum info endpoint', async () => {
    const loading = service.getPhoto('101');
    httpMock.expectOne('https://picsum.photos/id/101/info').flush(mockPhoto);
    expect(await loading).toEqual(mockPhoto);
  });

  it('should toggle a favorite on and off', () => {
    expect(service.toggleFavorite(mockPhoto)).toBeTrue();
    expect(service.isFavorite('101')).toBeTrue();

    expect(service.toggleFavorite(mockPhoto)).toBeFalse();
    expect(service.isFavorite('101')).toBeFalse();
  });

  describe('loading favorites from localStorage', () => {
    // The service reads localStorage on construction, so each case needs a fresh instance
    function serviceWithStored(value: string): PhotoService {
      localStorage.setItem('favorites_photos', value);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [PhotoService, provideHttpClient(), provideHttpClientTesting()]
      });
      httpMock = TestBed.inject(HttpTestingController);
      return TestBed.inject(PhotoService);
    }

    it('should start empty when the stored JSON is corrupt', () => {
      expect(serviceWithStored('{not json').favorites()).toEqual([]);
    });

    it('should start empty when the stored value is not an array', () => {
      expect(serviceWithStored('{"id":"101"}').favorites()).toEqual([]);
    });

    it('should keep only entries with the Photo shape', () => {
      const stored = JSON.stringify([mockPhoto, null, 'x', { id: 7, author: 'A' }, { ...mockPhoto, id: '102', width: '200' }]);
      expect(serviceWithStored(stored).favorites()).toEqual([mockPhoto]);
    });
  });
});