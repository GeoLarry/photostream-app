import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhotoDetails } from './photo-details';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoService } from '../../shared/services/photo.service';

describe('PhotoDetails', () => {
  let component: PhotoDetails;
  let fixture: ComponentFixture<PhotoDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoDetails],
      providers: [
        PhotoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoDetails);
    component = fixture.componentInstance;

    // 1. First, supply the required input value to the Signal proxy
    fixture.componentRef.setInput('id', 'some-test-id-123');

    // 2. Then, trigger initial change detection to render the component safely
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});