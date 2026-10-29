# Photostream

A full-stack photo gallery: browse an endless stream of photos and keep your favorites.

[![API](https://github.com/GeoLarry/photostream-app/actions/workflows/api.yml/badge.svg)](https://github.com/GeoLarry/photostream-app/actions/workflows/api.yml)
[![Web](https://github.com/GeoLarry/photostream-app/actions/workflows/web.yml/badge.svg)](https://github.com/GeoLarry/photostream-app/actions/workflows/web.yml)

## Features

- Infinite scroll over photos from [Picsum](https://picsum.photos), with a detail page for every photo
- Accounts: sign up with email confirmation, log in, stay signed in across reloads
- Favorites saved per user on the API; visitors are invited to log in
- Admin page for users: search, paging, roles, email and account status, each user's favorites, deactivate / reactivate, confirm an email by hand
- Permission-based access end to end: roles grant `(Module, Action)` permissions, the API checks them on every request, the UI shows only what the user may do

## Tech stack

| Part | Technologies |
|---|---|
| Frontend (`web/`) | Angular 22, standalone components, signals, zoneless change detection, OnPush, Angular Material |
| Backend (`api/`) | .NET 10 Minimal API, EF Core (SQLite / SQL Server), JWT, permission-based authorization, Bogus seeding |
| Tests | Vitest unit tests for the Angular app (jsdom), xUnit integration tests over the real HTTP pipeline |
| CI | GitHub Actions, one workflow per folder |

## Repository layout

```
api/   .NET 10 backend (see api/README.md)
web/   Angular frontend
```

## Run locally

Mail server for sign-up emails (requires Docker):

```bash
docker compose up -d
```

[Mailpit](https://mailpit.axllent.org) catches every email the API sends: open the inbox at http://localhost:8025. Without it the API still runs and writes each email, with its confirmation link, to the console.

Backend (requires the .NET 10 SDK):

```bash
cd api
dotnet run --project src/Starter.Api
```

API on http://localhost:5080, API reference at http://localhost:5080/scalar/v1. Development admin: `admin` / `Admin123!`, demo users: `Demo123!`.

New sign-ups must confirm their email before they can log in. Accounts created by the seeder or by an admin start confirmed.

The schema is created on first run and there are no migrations yet. After pulling changes to the data model (favorites, email confirmation), delete `api/src/Starter.Api/app.db` once so it is recreated.

Frontend (requires Node.js 22):

```bash
cd web
npm install
npm start
```

App on http://localhost:4200.

### Accounts to try

| Account | Password | Can |
|---|---|---|
| `admin` | `Admin123!` | Everything, including **Admin → Users** in the header |
| Any demo user, e.g. from the admin page | `Demo123!` | Browse and keep favorites |
| A new sign-up | your own | Confirm the email in Mailpit (http://localhost:8025), then log in |

## Roadmap

- [x] Fix duplicate photos, image sizes and mobile favorites
- [x] Favorites stored per user on the API
- [x] Login and registration in the frontend, with email confirmation
- [x] Admin page for users
- [x] Upgrade to the latest Angular and Vitest
- [ ] Live demo
