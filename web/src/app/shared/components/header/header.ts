import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton
  ],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './header.scss',
})
export class Header {

  private auth = inject(AuthService);
  private router = inject(Router);

  user = this.auth.currentUser;
  canAdminUsers = computed(() => this.auth.hasPermission('Users.View'));

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
