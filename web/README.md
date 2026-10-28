# Photostream web

Angular frontend of Photostream: an infinite photostream from [Lorem Picsum](https://picsum.photos), a detail page for any photo, and favorites saved in the browser.

## Features
- **Photostream** (`/`): starts on a random Picsum page, then loads the next pages as you scroll, without duplicates.
- **Photo details** (`/photos/:id`): opens any photo, from favorites or from Picsum, and lets you add or remove it as a favorite.
- **Favorites** (`/favorites`): photos you liked, kept in `localStorage`.

Images are requested from Picsum at the size they are displayed (600×400 in grids, about 1200px wide on the detail page) through a custom `NgOptimizedImage` loader.

## Stack
- Angular 20: standalone components, signals, zoneless change detection
- Angular Material
- Karma + Jasmine for unit tests

## Getting started
```bash
npm install
npm start          # dev server on http://localhost:4200
npm run build      # production build in dist/
npm test           # unit tests (add -- --watch=false for a single run)
```

## Structure
```
src/app/
  features/      one folder per page: photos, photo-details, favorites
  shared/        header component, PhotoService, Picsum image loader
  models/        TypeScript interfaces for API data
```
