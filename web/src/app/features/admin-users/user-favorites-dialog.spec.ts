import type { MockOf } from '../../shared/testing/mock-of';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { IMAGE_LOADER } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserFavoritesDialog } from './user-favorites-dialog';
import { AdminUsersService } from '../../shared/services/admin-users.service';
import { picsumLoader } from '../../shared/images/picsum-loader';
import { Photo } from '../../models/photo.model';

describe('UserFavoritesDialog', () => {
  let fixture: ComponentFixture<UserFavoritesDialog>;
  let admin: MockOf<AdminUsersService, 'favoritesOf'>;

  const photo: Photo = {
    id: '10', author: 'Alejandro Escamilla', width: 5000, height: 3333,
    url: 'https://unsplash.com/photos/10', download_url: 'https://picsum.photos/id/10/5000/3333',
  };
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function open() {
    await TestBed.configureTestingModule({
      imports: [UserFavoritesDialog],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AdminUsersService, useValue: admin },
        { provide: MAT_DIALOG_DATA, useValue: { id: 2, username: 'maria' } },
        { provide: IMAGE_LOADER, useValue: picsumLoader },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserFavoritesDialog);
    await fixture.whenStable();
  }

  beforeEach(() => {
    admin = {
      favoritesOf: vi.fn().mockName('AdminUsersService.favoritesOf')
    };
  });

  it("shows the user's favorites", async () => {
    admin.favoritesOf.mockResolvedValue([photo]);
    await open();

    expect(text()).toContain('Favorites of maria');
    expect(text()).toContain('Alejandro Escamilla');
    expect(admin.favoritesOf).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('says when there are none', async () => {
    admin.favoritesOf.mockResolvedValue([]);
    await open();
    expect(text()).toContain('No favorites yet.');
  });

  it('says when they could not be loaded', async () => {
    admin.favoritesOf.mockRejectedValue(new Error('500'));
    await open();
    expect(text()).toContain("couldn't load the favorites");
  });
});
