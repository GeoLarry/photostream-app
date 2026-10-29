import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(), // the header asks AuthService who is signed in
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the layout structural elements', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // Triggers template rendering
    const compiled = fixture.nativeElement as HTMLElement;

    // 👉 THE FIX: Verify the shell elements render cleanly instead of checking matching titles
    expect(compiled).toBeTruthy();

    // Check that our navigation headers rendered their structural content text
    expect(compiled.textContent).toContain('Photostream');
    expect(compiled.textContent).toContain('Favorites');
  });
});