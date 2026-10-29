import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { API_URL } from '../http/api-url';
import { PagedResponse, UserSummary } from '../../models/user.model';
import { FavoriteResponse } from '../../models/favorite.model';
import { Photo } from '../../models/photo.model';
import { toPhoto } from './favorites.service';

export interface UserQuery {
  pageNumber: number;
  pageSize: number;
  search: string;
}

// User administration for the admin page. The API checks every permission again;
// the page only hides what the admin cannot do.
@Injectable({
  providedIn: 'root',
})
export class AdminUsersService {

  private http = inject(HttpClient);
  private url = `${API_URL}/users`;

  private pageSignal = signal<PagedResponse<UserSummary> | null>(null);
  private querySignal = signal<UserQuery>({ pageNumber: 1, pageSize: 10, search: '' });
  private isLoadingSignal = signal(false);
  private loadFailedSignal = signal(false);
  page = this.pageSignal.asReadonly();
  query = this.querySignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();
  loadFailed = this.loadFailedSignal.asReadonly();

  // Number of the newest request, so an answer to an older search cannot overwrite a newer one
  private requestId = 0;

  async load(changes: Partial<UserQuery> = {}): Promise<void> {
    const query = { ...this.querySignal(), ...changes };
    this.querySignal.set(query);
    const id = ++this.requestId;

    let params = new HttpParams().set('pageNumber', query.pageNumber).set('pageSize', query.pageSize);
    if (query.search.trim()) params = params.set('search', query.search.trim());

    this.isLoadingSignal.set(true);
    this.loadFailedSignal.set(false);
    try {
      const page = await firstValueFrom(this.http.get<PagedResponse<UserSummary>>(this.url, { params }));
      if (id === this.requestId) this.pageSignal.set(page);
    } catch {
      if (id === this.requestId) this.loadFailedSignal.set(true);
    } finally {
      if (id === this.requestId) this.isLoadingSignal.set(false);
    }
  }

  // Soft delete: the user cannot sign in, and tokens they hold stop working.
  deactivate(user: UserSummary): Promise<void> {
    return this.changeAndReplace(user, this.http.delete(`${this.url}/${user.id}`), { isActive: false });
  }

  reactivate(user: UserSummary): Promise<void> {
    return this.changeAndReplace(user, this.http.post(`${this.url}/${user.id}/reactivate`, null), { isActive: true });
  }

  // For a user who never received the confirmation email.
  confirmEmail(user: UserSummary): Promise<void> {
    return this.changeAndReplace(user, this.http.post(`${this.url}/${user.id}/confirm-email`, null), { emailConfirmed: true });
  }

  async favoritesOf(user: UserSummary): Promise<Photo[]> {
    const favorites = await firstValueFrom(this.http.get<FavoriteResponse[]>(`${this.url}/${user.id}/favorites`));
    return favorites.map(toPhoto);
  }

  // Runs the request, then updates that one row in place instead of reloading the page.
  private async changeAndReplace(user: UserSummary, request: Observable<unknown>, changes: Partial<UserSummary>): Promise<void> {
    await firstValueFrom(request);
    this.pageSignal.update(page => page && {
      ...page,
      items: page.items.map(u => (u.id === user.id ? { ...u, ...changes } : u)),
    });
  }
}
