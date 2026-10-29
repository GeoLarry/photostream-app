# Photostream web

Angular frontend of Photostream: an infinite photostream from [Lorem Picsum](https://picsum.photos), a detail page for any photo, accounts with email confirmation, favorites kept per user on the API, and an admin page for users.

## Features
- **Photostream** (`/`): starts on a random Picsum page, then loads the next pages as you scroll, without duplicates.
- **Photo details** (`/photos/:id`): opens any photo, from favorites or from Picsum, and lets you add or remove it as a favorite.
- **Favorites** (`/favorites`): photos you liked, saved to your account on the API.
- **Log in, sign up, email confirmation** (`/login`, `/register`, `/check-email`, `/confirm-email`).
- **Admin → Users** (`/admin/users`): search, page, deactivate or reactivate users, for roles with `Users.View`.

Images are requested from Picsum at the size they are displayed (600×400 in grids, about 1200px wide on the detail page) through a custom `NgOptimizedImage` loader.

## Stack
- Angular 22: standalone components, signals, zoneless change detection, OnPush by default
- Angular Material
- Vitest for unit tests

## Getting started
```bash
npm install
npm start          # dev server on http://localhost:4200, /api proxied to the API on :5080
npm run build      # production build in dist/
npm test           # unit tests (add -- --watch=false for a single run)
npm run lint       # ESLint: TypeScript, Angular and template accessibility rules
```

## Structure
```
src/app/
  features/      one folder per page: photos, photo-details, favorites, login, register, admin-users, ...
  shared/        header, services, guards, auth interceptor, API_URL, Picsum image loader, test helpers
  models/        TypeScript interfaces for API data
```
