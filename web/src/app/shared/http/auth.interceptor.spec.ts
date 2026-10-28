import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  const signIn = async () => {
    const login = auth.login({ username: 'jane', password: 'Password1' });
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      token: 'jwt-token',
      expiresAtUtc: new Date(Date.now() + 3600_000).toISOString(),
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

    http.get(`${environment.apiUrl}/api/favorites`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/favorites`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });

  it('never sends the token to other sites', async () => {
    await signIn();

    http.get('https://picsum.photos/v2/list').subscribe();

    const req = httpMock.expectOne('https://picsum.photos/v2/list');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('sends no header when signed out', () => {
    http.get(`${environment.apiUrl}/health`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/health`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('signs out and goes to login on a 401 while signed in', async () => {
    await signIn();
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    const request = firstValueFrom(http.get(`${environment.apiUrl}/api/favorites`));
    httpMock.expectOne(`${environment.apiUrl}/api/favorites`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(request).toBeRejected();

    expect(auth.isAuthenticated()).toBeFalse();
    expect(navigate).toHaveBeenCalledWith(['/login'], jasmine.objectContaining({ queryParams: jasmine.any(Object) }));
  });

  it('does not redirect on a 401 while signed out, e.g. a wrong password', async () => {
    const navigate = spyOn(router, 'navigate');

    const login = auth.login({ username: 'jane', password: 'wrong' });
    httpMock.expectOne(`${environment.apiUrl}/api/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await expectAsync(login).toBeRejected();

    expect(navigate).not.toHaveBeenCalled();
  });
});
