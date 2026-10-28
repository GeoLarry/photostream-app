import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { FavoriteActions } from './favorite-actions';
import { FavoritesService } from './favorites.service';
import { Photo } from '../../models/photo.model';

describe('FavoriteActions', () => {
  const photo: Photo = {
    id: '10', author: 'John Doe', width: 5000, height: 3333,
    url: 'https://unsplash.com/photos/10', download_url: 'https://picsum.photos/id/10/5000/3333',
  };

  let actions: FavoriteActions;
  let favorites: jasmine.SpyObj<FavoritesService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let snackAction: Subject<void>;

  beforeEach(() => {
    favorites = jasmine.createSpyObj<FavoritesService>('FavoritesService', ['toggle']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackAction = new Subject<void>();
    snackBar.open.and.returnValue({ onAction: () => snackAction.asObservable() } as MatSnackBarRef<TextOnlySnackBar>);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FavoritesService, useValue: favorites },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    actions = TestBed.inject(FavoriteActions);
  });

  it('confirms an added favorite', async () => {
    favorites.toggle.and.resolveTo('added');
    await actions.toggle(photo);
    expect(snackBar.open).toHaveBeenCalledWith('Added to Favorites! ❤️', 'Close', jasmine.any(Object));
  });

  it('confirms a removed favorite', async () => {
    favorites.toggle.and.resolveTo('removed');
    await actions.toggle(photo);
    expect(snackBar.open).toHaveBeenCalledWith('Removed from Favorites!', 'Close', jasmine.any(Object));
  });

  it('asks a visitor to log in and brings them back afterwards', async () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url').and.returnValue('/photos/10');
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    favorites.toggle.and.resolveTo('login-required');

    await actions.toggle(photo);
    expect(snackBar.open).toHaveBeenCalledWith('Log in to save favorites', 'Log in', jasmine.any(Object));

    snackAction.next();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/photos/10' } });
  });

  it('says so when the change could not be saved', async () => {
    favorites.toggle.and.rejectWith(new Error('500'));
    await actions.toggle(photo);
    expect(snackBar.open).toHaveBeenCalledWith("Couldn't update your favorites. Please try again.", 'Close', jasmine.any(Object));
  });

  it('stays quiet for a click while the previous one is saving', async () => {
    favorites.toggle.and.resolveTo('busy');
    await actions.toggle(photo);
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});
