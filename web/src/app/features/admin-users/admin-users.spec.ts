import type { MockOf } from '../../shared/testing/mock-of';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminUsers } from './admin-users';
import { AdminUsersService, UserQuery } from '../../shared/services/admin-users.service';
import { AuthService } from '../../shared/services/auth.service';
import { PagedResponse, UserSummary } from '../../models/user.model';
import { UserFavoritesDialog } from './user-favorites-dialog';

describe('AdminUsers', () => {
  const user = (id: number, changes: Partial<UserSummary> = {}): UserSummary => ({
    id, username: `user${id}`, email: `user${id}@example.com`, firstName: 'Maria', lastName: 'K',
    isActive: true, emailConfirmed: true, createdAtUtc: '2026-03-15T23:30:00Z', roles: [{ id: 3, name: 'User' }], ...changes,
  });

  let fixture: ComponentFixture<AdminUsers>;
  let admin: MockOf<AdminUsersService, 'load' | 'deactivate' | 'reactivate' | 'confirmEmail'> & {
    page: ReturnType<typeof signal<PagedResponse<UserSummary> | null>>;
  };
  let permissions: ReturnType<typeof signal<string[]>>;
  let snackBar: MockOf<MatSnackBar, 'open'>;
  let dialog: MockOf<MatDialog, 'open'>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const row = (i: number) => (fixture.nativeElement as HTMLElement).querySelectorAll('tr.mat-mdc-row')[i] as HTMLElement;
  const button = (r: HTMLElement, label: string) => Array.from(r.querySelectorAll('button')).find(b => b.textContent?.trim() === label);

  async function render(users: UserSummary[]) {
    admin.page.set({ items: users, totalCount: users.length, pageNumber: 1, pageSize: 10 });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    const page = signal<PagedResponse<UserSummary> | null>(null);
    admin = Object.assign({
      load: vi.fn().mockName('AdminUsersService.load'),
      deactivate: vi.fn().mockName('AdminUsersService.deactivate'),
      reactivate: vi.fn().mockName('AdminUsersService.reactivate'),
      confirmEmail: vi.fn().mockName('AdminUsersService.confirmEmail')
    }, {
      page,
      query: signal<UserQuery>({ pageNumber: 1, pageSize: 10, search: '' }).asReadonly(),
      isLoading: signal(false).asReadonly(),
      loadFailed: signal(false).asReadonly(),
    });
    admin.load.mockResolvedValue();
    permissions = signal(['Users.View', 'Users.Edit', 'Users.Delete']);
    snackBar = {
      open: vi.fn().mockName('MatSnackBar.open')
    };
    dialog = {
      open: vi.fn().mockName('MatDialog.open')
    };

    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AdminUsersService, useValue: admin },
        { provide: AuthService, useValue: { hasPermission: (p: string) => permissions().includes(p), currentUser: signal({ id: 1 }) } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
  });

  it('loads the users when opened', async () => {
    await render([]);
    expect(admin.load).toHaveBeenCalled();
  });

  it('shows each user with email state, roles, status and the date it joined', async () => {
    await render([user(2, { emailConfirmed: false, isActive: false })]);

    const r = row(0);
    expect(r.textContent).toContain('user2');
    expect(r.textContent).toContain('Maria K');
    expect(r.textContent).toContain('Not confirmed');
    expect(r.textContent).toContain('User');
    expect(r.textContent).toContain('Deactivated');
    expect(r.textContent).toMatch(/Mar 1[56], 2026/); // local date of 2026-03-15T23:30Z
  });

  it('offers only the actions that apply to each user', async () => {
    await render([user(1), user(2), user(3, { isActive: false, emailConfirmed: false })]);

    expect(button(row(0), 'Deactivate'), 'not on yourself').toBeUndefined();
    expect(row(0).textContent).toContain('(you)');
    expect(button(row(1), 'Deactivate')).toBeDefined();
    expect(button(row(1), 'Confirm email')).toBeUndefined();
    expect(button(row(2), 'Reactivate')).toBeDefined();
    expect(button(row(2), 'Confirm email')).toBeDefined();
  });

  it('hides actions the admin has no permission for', async () => {
    permissions.set(['Users.View']);
    await render([user(2), user(3, { isActive: false, emailConfirmed: false })]);

    expect(button(row(0), 'Deactivate')).toBeUndefined();
    expect(button(row(1), 'Reactivate')).toBeUndefined();
    expect(button(row(1), 'Confirm email')).toBeUndefined();
    expect(button(row(0), 'Favorites')).toBeDefined();
  });

  it('deactivates a user and confirms it', async () => {
    admin.deactivate.mockResolvedValue();
    await render([user(2)]);

    button(row(0), 'Deactivate')!.click();
    await fixture.whenStable();

    expect(admin.deactivate).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    expect(snackBar.open).toHaveBeenCalledWith('user2 can no longer sign in.', 'Close', expect.any(Object));
  });

  it("shows the API's reason when an action is refused", async () => {
    admin.deactivate.mockRejectedValue(new HttpErrorResponse({
      status: 400, error: { message: 'This account holds a protected role and cannot be deactivated.' },
    }));
    await render([user(2)]);

    button(row(0), 'Deactivate')!.click();
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('This account holds a protected role and cannot be deactivated.', 'Close', expect.any(Object));
  });

  it("opens a user's favorites", async () => {
    await render([user(2)]);

    button(row(0), 'Favorites')!.click();

    expect(dialog.open).toHaveBeenCalledWith(UserFavoritesDialog, expect.objectContaining({ data: expect.objectContaining({ id: 2 }) }));
  });

  it('searches after typing stops, from the first page', async () => {
    vi.useFakeTimers();
    try {
      fixture.detectChanges(); // ngOnInit
      admin.load.mockClear();
      fixture.componentInstance.search.setValue('mar');
      fixture.componentInstance.search.setValue('maria');
      vi.advanceTimersByTime(299);
      expect(admin.load).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(admin.load).toHaveBeenCalledTimes(1);
      expect(admin.load).toHaveBeenCalledWith({ search: 'maria', pageNumber: 1 });
    } finally {
      fixture.destroy();
      vi.useRealTimers();
    }
  });

  it('asks for the page the paginator moves to', async () => {
    await render([user(2)]);

    fixture.componentInstance.changePage({ pageIndex: 2, pageSize: 25, length: 100 });

    expect(admin.load).toHaveBeenCalledWith({ pageNumber: 3, pageSize: 25 });
  });

  it('says so when nothing matches', async () => {
    await render([]);
    expect(text()).toContain('No users match your search.');
  });
});
