# Photostream web: Angular

## Stack
- Angular with **standalone components only** (no NgModules), **zoneless** change detection, **signals** for state.
- New control flow (`@if`, `@for` with `track`, `@empty`, `@defer`), never `*ngIf` / `*ngFor`.
- `inject()` for dependencies, no constructor injection.
- Route params bound to `input()` via `withComponentInputBinding()`.
- Angular Material for UI components, imported directly in each component that uses them.

## Structure
- `src/app/features/<feature>/`: one folder per page (component, template, styles, spec).
- `src/app/shared/`: reusable components and services.
- `src/app/models/`: TypeScript interfaces for API data.

## Conventions
- Services own state as private writable signals and expose read-only signals (`asReadonly()`).
- Components stay thin: template bindings and user events, logic in services.
- Images from Picsum are requested at the size they are displayed, never the original `download_url` in grids.
- Every interactive control has an accessible name (`aria-label` for icon buttons).
- Every component and service has a spec; run `npm test` before committing.

## Commands
- `npm start`: dev server on http://localhost:4200
- `npm run build`: production build
- `npm test`: unit tests
