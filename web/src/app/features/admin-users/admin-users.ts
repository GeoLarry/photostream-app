import { Component, DestroyRef, OnInit, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AdminUsersService } from '../../shared/services/admin-users.service';
import { AuthService } from '../../shared/services/auth.service';
import { apiErrorMessage } from '../../shared/http/api-error';
import { UserSummary } from '../../models/user.model';
import { UserFavoritesDialog } from './user-favorites-dialog';

@Component({
  selector: 'app-admin-users',
  imports: [
    DatePipe, ReactiveFormsModule, MatTableModule, MatPaginator, MatFormField, MatLabel, MatInput, MatIcon,
    MatButton, MatChipSet, MatChip, MatProgressBar,
  ],
  templateUrl: './admin-users.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {

  private admin = inject(AdminUsersService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  page = this.admin.page;
  query = this.admin.query;
  isLoading = this.admin.isLoading;
  loadFailed = this.admin.loadFailed;
  users = computed(() => this.page()?.items ?? []);

  columns = ['user', 'email', 'roles', 'status', 'created', 'actions'];
  search = new FormControl(this.admin.query().search, { nonNullable: true });

  // What this admin may do; the API checks the same permissions again
  canEdit = computed(() => this.auth.hasPermission('Users.Edit'));
  canDeactivate = computed(() => this.auth.hasPermission('Users.Delete'));
  private myId = computed(() => this.auth.currentUser()?.id);

  ngOnInit(): void {
    this.admin.load();
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(search => this.admin.load({ search, pageNumber: 1 }));
  }

  changePage(event: PageEvent): void {
    this.admin.load({ pageNumber: event.pageIndex + 1, pageSize: event.pageSize });
  }

  reload(): void {
    this.admin.load();
  }

  isMe(user: UserSummary): boolean {
    return user.id === this.myId();
  }

  fullName(user: UserSummary): string {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }

  showFavorites(user: UserSummary): void {
    this.dialog.open(UserFavoritesDialog, { data: user, width: '640px', maxWidth: '95vw' });
  }

  deactivate(user: UserSummary): Promise<void> {
    return this.run(() => this.admin.deactivate(user), `${user.username} can no longer sign in.`);
  }

  reactivate(user: UserSummary): Promise<void> {
    return this.run(() => this.admin.reactivate(user), `${user.username} can sign in again.`);
  }

  confirmEmail(user: UserSummary): Promise<void> {
    return this.run(() => this.admin.confirmEmail(user), `${user.username}'s email is confirmed.`);
  }

  private async run(action: () => Promise<void>, success: string): Promise<void> {
    try {
      await action();
      this.snackBar.open(success, 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open(apiErrorMessage(error), 'Close', { duration: 5000 });
    }
  }
}
