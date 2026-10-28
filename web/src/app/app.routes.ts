import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        // Lazy-loading the Photostream component
        path: '',
        loadComponent: () => import('./features/photos/photos').then(m => m.Photos)
    },
    {
        path: 'favorites',
        loadComponent: () => import('./features/favorites/favorites').then(m => m.Favorites)
    },
    {
        path: 'photos/:id',
        loadComponent: () => import('./features/photo-details/photo-details').then(m => m.PhotoDetails)
    },
    {
        path: '**',
        // Fallback redirect for any invalid URLs
        redirectTo: ''
    }
];
