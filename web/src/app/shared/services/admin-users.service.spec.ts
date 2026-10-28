import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUsersService } from './admin-users.service';
import { PagedResponse, UserSummary } from '../../models/user.model';
import { environment } from '../../../environments/environment';

describe('AdminUsersService', () => {
  const url = `${environment.apiUrl}/api/users`;
  const user = (id: number, changes: Partial<UserSummary> = {}): UserSummary => ({
    id, username: `user${id}`, email: `user${id}@example.com`, firstName: null, lastName: null,
    isActive: true, emailConfirmed: true, createdAtUtc: '2026-10-28T10:00:00Z', roles: [{ id: 3, name: 'User' }], ...changes,
  });
  const page = (items: UserSummary[], totalCount = items.length): PagedResponse<UserSummary> =>
    ({ items, totalCount, pageNumber: 1, pageSize: 10 });

  let service: AdminUsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  async function loadWith(items: UserSummary[]) {
    const loading = service.load();
    httpMock.expectOne(r => r.url === url).flush(page(items));
    await loading;
  }

  it('loads the first page', async () => {
    const loading = service.load();
    const req = httpMock.expectOne(r => r.url === url);
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.has('search')).toBeFalse();
    req.flush(page([user(1)], 42));
    await loading;

    expect(service.page()?.totalCount).toBe(42);
    expect(service.isLoading()).toBeFalse();
  });

  it('keeps the query between calls and sends a trimmed search', async () => {
    const loading = service.load({ search: '  maria ', pageNumber: 2, pageSize: 25 });
    const req = httpMock.expectOne(r => r.url === url);
    expect(req.request.params.get('search')).toBe('maria');
    expect(req.request.params.get('pageNumber')).toBe('2');
    req.flush(page([]));
    await loading;

    const next = service.load({ pageNumber: 3 });
    const second = httpMock.expectOne(r => r.url === url);
    expect(second.request.params.get('search')).toBe('maria');
    expect(second.request.params.get('pageSize')).toBe('25');
    second.flush(page([]));
    await next;
  });

  it('ignores the answer to an older search', async () => {
    const older = service.load({ search: 'ma' });
    const newer = service.load({ search: 'maria' });
    const [first, second] = httpMock.match(r => r.url === url);

    second.flush(page([user(2)]));
    await newer;
    first.flush(page([user(1), user(3)]));
    await older;

    expect(service.page()?.items.map(u => u.id)).toEqual([2]);
  });

  it('reports a failed load', async () => {
    const loading = service.load();
    httpMock.expectOne(r => r.url === url).flush(null, { status: 500, statusText: 'Server Error' });
    await loading;

    expect(service.loadFailed()).toBeTrue();
  });

  it('deactivates and reactivates a user, updating the row', async () => {
    await loadWith([user(1), user(2)]);

    const deactivating = service.deactivate(user(2));
    const del = httpMock.expectOne(`${url}/2`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'User deactivated.' });
    await deactivating;
    expect(service.page()?.items.find(u => u.id === 2)?.isActive).toBeFalse();

    const reactivating = service.reactivate(user(2));
    httpMock.expectOne(`${url}/2/reactivate`).flush({ message: 'User reactivated.' });
    await reactivating;
    expect(service.page()?.items.find(u => u.id === 2)?.isActive).toBeTrue();
  });

  it('confirms an email by hand', async () => {
    await loadWith([user(5, { emailConfirmed: false })]);

    const confirming = service.confirmEmail(user(5));
    const req = httpMock.expectOne(`${url}/5/confirm-email`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Email confirmed.' });
    await confirming;

    expect(service.page()?.items[0].emailConfirmed).toBeTrue();
  });

  it('leaves the row as it was when the API refuses', async () => {
    await loadWith([user(1)]);

    const deactivating = service.deactivate(user(1));
    httpMock.expectOne(`${url}/1`).flush({ message: 'You cannot deactivate your own account.' }, { status: 400, statusText: 'Bad Request' });

    await expectAsync(deactivating).toBeRejected();
    expect(service.page()?.items[0].isActive).toBeTrue();
  });

  it("returns a user's favorites as photos", async () => {
    const loading = service.favoritesOf(user(1));
    httpMock.expectOne(`${url}/1/favorites`).flush([{
      photoId: '10', author: 'A', width: 10, height: 5, url: 'https://u/10', downloadUrl: 'https://d/10', createdAtUtc: '2026-10-28T10:00:00Z',
    }]);

    expect(await loading).toEqual([{ id: '10', author: 'A', width: 10, height: 5, url: 'https://u/10', download_url: 'https://d/10' }]);
  });
});
