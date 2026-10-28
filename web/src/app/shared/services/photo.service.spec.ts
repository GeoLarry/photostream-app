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
    TestBed.configureTestingModule({
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional testing HTTP client provider
      ]
    });

    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test to guarantee an isolated state
    localStorage.clear();
  });

  afterEach(() => {
    // Verify that no mismatched or outstanding HTTP requests remain open
    httpMock.verify();
  });

  // Test 1: Verifies that the service instantiates correctly
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test 2: Verifies fetching data from Picsum API and handling the Promise stream (Async/Await)
  it('should fetch random photos from Picsum API', async () => {
    const dummyPhotos: Photo[] = [mockPhoto];
    const count = 1;

    // Call the Promise-based API method
    const promise = service.getRandomPhotos(count);

    // Match any GET request that hits the picsum list endpoint
    const req = httpMock.expectOne((request) => request.url.startsWith('https://picsum.photos/v2/list'));
    expect(req.request.method).toBe('GET');
    
    // Respond with dummy data to resolve the Promise
    req.flush(dummyPhotos);

    const photos = await promise;
    expect(photos.length).toBe(1);
    expect(photos).toEqual(dummyPhotos);
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