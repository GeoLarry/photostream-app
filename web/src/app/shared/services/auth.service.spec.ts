import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthResponse, CurrentUser } from '../../models/auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  const authUrl = `${environment.apiUrl}/api/auth`;
  const user: CurrentUser = {
    id: 7, username: 'jane', email: 'jane@example.com', firstName: 'Jane', lastName: null,
    roles: [{ id: 3, name: 'User' }], permissions: ['Favorites.View', 'Favorites.Create'],
  };
  const inOneHour = () => new Date(Date.now() + 3600000).toISOString();
  const authResponse = (): AuthResponse => ({ token: 'jwt-token', expiresAtUtc: inOneHour(), user });

  let httpMock: HttpTestingController;

  function createService(): AuthService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts signed out', () => {
    const service = createService();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('signs in on login and stores the session', async () => {
    const service = createService();

    const login = service.login({ username: 'jane', password: 'Password1' });
    const req = httpMock.expectOne(`${authUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(authResponse());
    await login;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt-token');
    expect(service.currentUser()?.username).toBe('jane');
    expect(localStorage.getItem('auth_session')).toContain('jwt-token');
  });

  it('checks permissions from the signed-in user', async () => {
    const service = createService();
    const login = service.login({ username: 'jane', password: 'Password1' });
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse());
    await login;

    expect(service.hasPermission('Favorites.View')).toBe(true);
    expect(service.hasPermission('Users.View')).toBe(false);
  });

  it('does not sign in on register and returns the API message', async () => {
    const service = createService();

    const register = service.register({ username: 'jane', email: 'jane@example.com', password: 'Password1', firstName: null, lastName: null });
    httpMock.expectOne(`${authUrl}/register`).flush({ message: 'Check your email.' }, { status: 202, statusText: 'Accepted' });

    expect(await register).toBe('Check your email.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('signs in when the email is confirmed', async () => {
    const service = createService();

    const confirm = service.confirmEmail('link-token');
    const req = httpMock.expectOne(`${authUrl}/confirm-email`);
    expect(req.request.body).toEqual({ token: 'link-token' });
    req.flush(authResponse());
    await confirm;

    expect(service.isAuthenticated()).toBe(true);
  });

  it('asks for a new confirmation link', async () => {
    const service = createService();

    const resend = service.resendConfirmation('jane@example.com');
    const req = httpMock.expectOne(`${authUrl}/resend-confirmation`);
    expect(req.request.body).toEqual({ email: 'jane@example.com' });
    req.flush({ message: 'Sent.' }, { status: 202, statusText: 'Accepted' });

    expect(await resend).toBe('Sent.');
  });

  it('restores a stored session with fresh user details', async () => {
    localStorage.setItem('auth_session', JSON.stringify({ token: 'stored', expiresAtUtc: inOneHour() }));
    const service = createService();

    const restore = service.restoreSession();
    httpMock.expectOne(`${authUrl}/me`).flush(user);
    await restore;

    expect(service.token()).toBe('stored');
    expect(service.currentUser()?.id).toBe(7);
  });

  it('drops a stored session the API rejects', async () => {
    localStorage.setItem('auth_session', JSON.stringify({ token: 'revoked', expiresAtUtc: inOneHour() }));
    const service = createService();

    const restore = service.restoreSession();
    httpMock.expectOne(`${authUrl}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await restore;

    expect(service.token()).toBeNull();
    expect(localStorage.getItem('auth_session')).toBeNull();
  });

  it('keeps the token when the API cannot be reached', async () => {
    localStorage.setItem('auth_session', JSON.stringify({ token: 'stored', expiresAtUtc: inOneHour() }));
    const service = createService();

    const restore = service.restoreSession();
    httpMock.expectOne(`${authUrl}/me`).error(new ProgressEvent('error'));
    await restore;

    expect(service.token()).toBe('stored');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('ignores an expired or corrupt stored session without calling the API', async () => {
    localStorage.setItem('auth_session', JSON.stringify({ token: 'old', expiresAtUtc: '2020-01-01T00:00:00Z' }));
    expect(createService().token()).toBeNull();
    await TestBed.inject(AuthService).restoreSession();

    TestBed.resetTestingModule();
    localStorage.setItem('auth_session', '{not json');
    expect(createService().token()).toBeNull();
  });

  it('clears everything on logout', async () => {
    const service = createService();
    const login = service.login({ username: 'jane', password: 'Password1' });
    httpMock.expectOne(`${authUrl}/login`).flush(authResponse());
    await login;

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('auth_session')).toBeNull();
  });
});
