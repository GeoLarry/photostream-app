import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Favorites } from './favorites';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';

describe('Favorites', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional testing HTTP client provider
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
