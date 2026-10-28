import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { guestGuard } from './shared/guards/guest.guard';

export const routes: Routes = [
    {
        // Lazy-loading the Photostream component
        path: '',
        loadComponent: () => import('./features/photos/photos').then(m => m.Photos)
    },
    {
        // Favorites belong to an account
        path: 'favorites',
        canActivate: [authGuard],
        loadComponent: () => import('./features/favorites/favorites').then(m => m.Favorites)
    },
    {
        path: 'photos/:id',
        loadComponent: () => import('./features/photo-details/photo-details').then(m => m.PhotoDetails)
    },
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/login/login').then(m => m.Login)
    },
    {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/register/register').then(m => m.Register)
    },
    {
        // "Check your inbox" after sign-up, and the place to ask for a new confirmation link
        path: 'check-email',
        loadComponent: () => import('./features/check-email/check-email').then(m => m.CheckEmail)
    },
    {
        // Opened from the link in the confirmation email
        path: 'confirm-email',
        loadComponent: () => import('./features/confirm-email/confirm-email').then(m => m.ConfirmEmail)
    },
    {
        path: '**',
        // Fallback redirect for any invalid URLs
        redirectTo: ''
    }
];
