# Photostream

A full-stack photo gallery: browse an endless stream of photos and keep your favorites.

[![API](https://github.com/GeoLarry/photostream-app/actions/workflows/api.yml/badge.svg)](https://github.com/GeoLarry/photostream-app/actions/workflows/api.yml)
[![Web](https://github.com/GeoLarry/photostream-app/actions/workflows/web.yml/badge.svg)](https://github.com/GeoLarry/photostream-app/actions/workflows/web.yml)

## Features

- Infinite scroll over photos from [Picsum](https://picsum.photos)
- Favorites with a photo detail page
- Sign up and log in with JWT, roles and permissions on the API

## Tech stack

| Part | Technologies |
|---|---|
| Frontend (`web/`) | Angular, standalone components, signals, zoneless change detection, Angular Material |
| Backend (`api/`) | .NET 10 Minimal API, EF Core (SQLite / SQL Server), JWT, permission-based authorization, Bogus seeding |
| Tests | Angular unit tests, xUnit integration tests over the real HTTP pipeline |
| CI | GitHub Actions, one workflow per folder |

## Repository layout

```
api/   .NET 10 backend (see api/README.md)
web/   Angular frontend
```

## Run locally

Backend (requires the .NET 10 SDK):

```bash
cd api
dotnet run --project src/Starter.Api
```

API on http://localhost:5080, API reference at http://localhost:5080/scalar/v1. Development admin: `admin` / `Admin123!`.

Roles are seeded only into an empty database. If you ran the API before favorites existed, delete `api/src/Starter.Api/app.db` once so the `User` role gets the `Favorites` permissions.

Frontend (requires Node.js 22):

```bash
cd web
npm install
npm start
```

App on http://localhost:4200.

## Roadmap

- [ ] Fix duplicate photos, image sizes and mobile favorites
- [ ] Upgrade to the latest Angular and Vitest
- [ ] Favorites stored per user on the API
- [ ] Login and registration in the frontend
- [ ] Live demo
