import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhotoDetails } from './photo-details';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IMAGE_LOADER } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { PhotoService } from '../../shared/services/photo.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FakeFavoritesService } from '../../shared/testing/fake-favorites.service';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { Photo } from '../../models/photo.model';

describe('PhotoDetails', () => {
  let component: PhotoDetails;
  let fixture: ComponentFixture<PhotoDetails>;
  let httpMock: HttpTestingController;
  let favorites: FakeFavoritesService;

  const photo: Photo = {
    id: '7',
    download_url: 'https://picsum.photos/id/7/4728/3168',
    width: 4728,
    height: 3168,
    url: 'https://unsplash.com/photos/abc',
    author: 'Alejandro Escamilla'
  };
  const infoUrl = 'https://picsum.photos/id/7/info';

  beforeEach(async () => {
    favorites = new FakeFavoritesService();
    await TestBed.configureTestingModule({
      imports: [PhotoDetails],
      providers: [
        PhotoService,
        { provide: FavoritesService, useValue: favorites },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: picsumLoader }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PhotoDetails);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Set the route id and render once the resource has settled
  async function open(id: string) {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function settle() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const toggle = () => fixture.nativeElement.querySelector('.fav-toggle') as HTMLButtonElement;

  it('loads a photo that is not a favorite from Picsum', async () => {
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeTruthy();

    httpMock.expectOne(infoUrl).flush(photo);
    await settle();

    expect(fixture.nativeElement.querySelector('mat-spinner')).toBeNull();
    expect(text()).toContain('Alejandro Escamilla');
    expect(toggle().textContent).toContain('Add to favorites');
  });

  it('shows a saved favorite without calling Picsum', async () => {
    favorites.list.set([photo]);
    await open('7');

    httpMock.expectNone(infoUrl);
    expect(text()).toContain('Alejandro Escamilla');
    expect(toggle().textContent).toContain('Remove from favorites');
  });

  it('says so when the photo cannot be loaded', async () => {
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    httpMock.expectOne(infoUrl).flush('Not found', { status: 404, statusText: 'Not Found' });
    await settle();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain("couldn't load this photo");
  });

  it('adds and removes the favorite without leaving the page', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();
    httpMock.expectOne(infoUrl).flush(photo);
    await settle();

    toggle().click();
    await settle();
    expect(favorites.isFavorite('7')).toBe(true);
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(toggle().textContent).toContain('Remove from favorites');

    toggle().click();
    await settle();
    expect(favorites.isFavorite('7')).toBe(false);
    expect(toggle().textContent).toContain('Add to favorites');
    expect(text()).toContain('Alejandro Escamilla');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('goes back to the photostream when the page was opened directly', async () => {
    favorites.list.set([photo]);
    await open('7');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.goBack();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
