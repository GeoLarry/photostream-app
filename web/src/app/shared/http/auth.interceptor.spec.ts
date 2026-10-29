import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { API_URL } from './api-url';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  const signIn = async () => {
    const login = auth.login({ username: 'jane', password: 'Password1' });
    httpMock.expectOne(`${API_URL}/auth/login`).flush({
      token: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
      user: { id: 1, username: 'jane', email: 'j@example.com', firstName: null, lastName: null, roles: [], permissions: [] },
    });
    await login;
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the token to API requests', async () => {
    await signIn();

    http.get(`${API_URL}/favorites`).subscribe();

    const req = httpMock.expectOne(`${API_URL}/favorites`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });

  it('never sends the token to other sites', async () => {
    await signIn();

    http.get('https://picsum.photos/v2/list').subscribe();

    const req = httpMock.expectOne('https://picsum.photos/v2/list');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('sends no token to app paths outside the API', async () => {
    await signIn();

    http.get('/apiary.json').subscribe();

    const req = httpMock.expectOne('/apiary.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sends no header when signed out', () => {
    http.get(`${API_URL}/health`).subscribe();

    const req = httpMock.expectOne(`${API_URL}/health`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('signs out and goes to login on a 401 while signed in', async () => {
    await signIn();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const request = firstValueFrom(http.get(`${API_URL}/favorites`));
    httpMock.expectOne(`${API_URL}/favorites`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(request).rejects.toThrow();

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.objectContaining({ queryParams: expect.any(Object) }));
  });

  it('does not redirect on a 401 while signed out, e.g. a wrong password', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const login = auth.login({ username: 'jane', password: 'wrong' });
    httpMock.expectOne(`${API_URL}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(login).rejects.toThrow();

    expect(navigate).not.toHaveBeenCalled();
  });
});
