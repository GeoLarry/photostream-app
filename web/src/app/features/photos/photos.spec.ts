import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Photos } from './photos';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';

describe('Photos', () => {
  let component: Photos;
  let fixture: ComponentFixture<Photos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Photos],
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting() // Modern functional testing HTTP client provider
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Photos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
