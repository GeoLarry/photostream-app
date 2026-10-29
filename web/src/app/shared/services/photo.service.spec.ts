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

  const photo101: Photo = {
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
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(PhotoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('photostream paging', () => {
    const photo = (id: string): Photo => ({ ...photo101, id });
    const listUrl = (page: number) => `https://picsum.photos/v2/list?page=${page}&limit=15`;
    // Let pending promise callbacks run so the next request is issued
    const settle = () => new Promise(resolve => setTimeout(resolve));

    beforeEach(() => {
      // Start page = 1 + floor(0.5 * 30) = 16
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    it('starts on a random page and then loads the pages in order', async () => {
      let loading = service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1'), photo('2')]);
      await loading;

      loading = service.loadNextPage();
      httpMock.expectOne(listUrl(17)).flush([photo('3')]);
      await loading;

      expect(service.photos().map(p => p.id)).toEqual(['1', '2', '3']);
    });

    it('skips photos that are already loaded', async () => {
      let loading = service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1'), photo('2'), photo('2')]);
      await loading;

      loading = service.loadNextPage();
      httpMock.expectOne(listUrl(17)).flush([photo('2'), photo('3')]);
      await loading;

      expect(service.photos().map(p => p.id)).toEqual(['1', '2', '3']);
    });

    it('wraps around to page 1 when a page comes back empty', async () => {
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

    it('ignores a second call while a page is loading', async () => {
      const loading = service.loadNextPage();
      service.loadNextPage();
      httpMock.expectOne(listUrl(16)).flush([photo('1')]);
      await loading;
      expect(service.isLoading()).toBe(false);
    });
  });

  it('returns a saved favorite without calling Picsum', async () => {
    favorites.list.set([photo101]);
    expect(await service.getPhoto('101')).toEqual(photo101);
    httpMock.expectNone('https://picsum.photos/id/101/info');
  });

  it('fetches any other photo from Picsum', async () => {
    const loading = service.getPhoto('101');
    httpMock.expectOne('https://picsum.photos/id/101/info').flush(photo101);
    expect(await loading).toEqual(photo101);
  });
});
