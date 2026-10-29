import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../http/api-url';
import { ApiMessage, AuthResponse, CurrentUser, LoginRequest, RegisterRequest } from '../../models/auth.model';

// The JWT is kept in localStorage so a reload keeps the user signed in. A deliberate trade-off for an SPA:
// an httpOnly cookie would hide it from scripts, but needs CSRF protection and same-site hosting.
const SESSION_KEY = 'auth_session';

interface StoredSession {
  token: string;
  expiresAtUtc: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private http = inject(HttpClient);
  private authUrl = `${API_URL}/auth`;

  private tokenSignal = signal<string | null>(readStoredSession()?.token ?? null);
  private userSignal = signal<CurrentUser | null>(null);

  token = this.tokenSignal.asReadonly();
  currentUser = this.userSignal.asReadonly();
  isAuthenticated = computed(() => this.userSignal() !== null);

  private permissions = computed(() => new Set(this.userSignal()?.permissions ?? []));

  // e.g. hasPermission('Users.View')
  hasPermission(permission: string): boolean {
    return this.permissions().has(permission);
  }

  async login(request: LoginRequest): Promise<void> {
    const response = await firstValueFrom(this.http.post<AuthResponse>(`${this.authUrl}/login`, request));
    this.startSession(response);
  }

  // Creates the account; the user signs in by opening the link in the confirmation email.
  async register(request: RegisterRequest): Promise<string> {
    const response = await firstValueFrom(this.http.post<ApiMessage>(`${this.authUrl}/register`, request));
    return response.message;
  }

  async confirmEmail(token: string): Promise<void> {
    const response = await firstValueFrom(this.http.post<AuthResponse>(`${this.authUrl}/confirm-email`, { token }));
    this.startSession(response);
  }

  async resendConfirmation(email: string): Promise<string> {
    const response = await firstValueFrom(this.http.post<ApiMessage>(`${this.authUrl}/resend-confirmation`, { email }));
    return response.message;
  }

  // On app start: turn a stored token back into a signed-in user, with fresh roles and permissions.
  async restoreSession(): Promise<void> {
    if (!this.tokenSignal()) return;

    try {
      const user = await firstValueFrom(this.http.get<CurrentUser>(`${this.authUrl}/me`));
      this.userSignal.set(user);
    } catch (error) {
      // 401: the token is no longer valid (expired, or the account was deactivated). Any other error
      // (e.g. the API is down) keeps the token, so a later reload can still restore the session.
      if (error instanceof HttpErrorResponse && error.status === 401) this.logout();
    }
  }

  logout(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Storage can be unavailable (e.g. blocked site data); the in-memory session is cleared anyway.
    }
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  private startSession(response: AuthResponse): void {
    const session: StoredSession = { token: response.token, expiresAtUtc: response.expiresAtUtc };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Without storage the user stays signed in until the page is reloaded.
    }
    this.tokenSignal.set(response.token);
    this.userSignal.set(response.user);
  }
}

// An expired or unreadable stored session counts as none.
function readStoredSession(): StoredSession | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { token, expiresAtUtc } = parsed as Record<string, unknown>;
    if (typeof token !== 'string' || typeof expiresAtUtc !== 'string') return null;
    return Date.parse(expiresAtUtc) > Date.now() ? { token, expiresAtUtc } : null;
  } catch {
    return null;
  }
}
