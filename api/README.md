# Photostream API

.NET 10 Minimal API for Photostream, built from the [dotnet-auth-starter](https://github.com/GeoLarry/dotnet-auth-starter) template: sign-up and login with JWT, users, roles and fine-grained permissions, a real database and seeded demo data.

All commands below run from this `api/` folder.

## What's inside

| Area | Details |
|---|---|
| API style | Minimal API, endpoints grouped per feature (`MapAuthEndpoints`, `MapUserEndpoints`, `MapRoleEndpoints`) |
| Auth | Register, login (username or email), `GET /api/auth/me`, JWT bearer tokens, BCrypt password hashing |
| Authorization | Permissions as `(Module, Action)` pairs on roles, users can hold several roles, `.RequirePermission(...)` on any endpoint |
| Live permissions | Permissions are checked against the database on every request, so role changes and deactivation apply to tokens already issued |
| Protected roles | Super Admin (immutable, never assignable), Administrator and User (built in, cannot be deleted). `System` permissions cannot be granted through the API |
| Data | EF Core 10, SQLite by default, SQL Server with one setting |
| Seeding | Roles, the first admin and (in Development) demo users generated with Bogus |
| Docs | OpenAPI + Scalar UI in Development, ready-made requests in `Starter.Api.http` |
| Tests | xUnit integration tests over the real HTTP pipeline with in-memory SQLite |
| CI | GitHub Actions: restore, build, test on every push and pull request |

## Project layout

```
src/
  Starter.Core/            Models, contracts (DTOs), interfaces, permission enums. No EF Core.
  Starter.Infrastructure/  EF Core DbContext, services, seeding, JWT + authorization wiring
  Starter.Api/             Program.cs, endpoints, exception handling, appsettings
tests/
  Starter.Api.Tests/       Integration tests with WebApplicationFactory
```

## Run it

Requirements: [.NET 10 SDK](https://dotnet.microsoft.com/download).

```bash
dotnet run --project src/Starter.Api
```

- API: `http://localhost:5080`, API reference (Scalar): `http://localhost:5080/scalar/v1`
- A SQLite file `app.db` is created on first run, with roles, the admin and 25 demo users.
- Development admin: `admin` / `Admin123!` (from `appsettings.Development.json`). Demo users use `Demo123!`.

Open `src/Starter.Api/Starter.Api.http` in VS Code (REST Client extension) to log in and try every endpoint.

Run the tests:

```bash
dotnet test
```

## Endpoints

| Method | Route | Permission |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | signed in |
| GET | `/api/users?pageNumber=&pageSize=&search=` | Users.View |
| GET | `/api/users/{id}` | Users.View |
| POST | `/api/users` | Users.Create |
| PUT | `/api/users/{id}` | Users.Edit |
| DELETE | `/api/users/{id}` (deactivate) | Users.Delete |
| POST | `/api/users/{id}/reactivate` | Users.Edit |
| GET | `/api/roles`, `/api/roles/{id}` | Roles.View |
| POST | `/api/roles` | Roles.Create |
| PUT | `/api/roles/{id}` | Roles.Edit (system roles also need System.Edit) |
| DELETE | `/api/roles/{id}` | Roles.Delete |
| GET | `/api/permissions` | Roles.View |
| GET | `/health` | public |

Errors from services come back as `400 { "message": "..." }`.

## Configuration

| Key | Default | Notes |
|---|---|---|
| `Database:Provider` | `Sqlite` | `Sqlite` or `SqlServer` |
| `ConnectionStrings:Default` | `Data Source=app.db` | SQL Server example: `Server=localhost;Database=Starter;Trusted_Connection=True;TrustServerCertificate=True` |
| `Jwt:Secret` | placeholder | **Required outside Development.** At least 32 characters; the app refuses to start with the placeholder |
| `Jwt:Issuer`, `Jwt:Audience` | `Starter.Api`, `Starter.Client` | |
| `Jwt:ExpiryMinutes` | `10080` (7 days) | |
| `Seed:AdminUsername`, `Seed:AdminEmail`, `Seed:AdminPassword` | `admin`, `admin@example.com`, empty | The admin is created only on an empty database, and only if a password is set |
| `Seed:DemoUsers` | `0` (`25` in Development) | Number of Bogus demo users |
| `Cors:AllowedOrigins` | `http://localhost:4200` | Angular dev server |

Keep secrets out of `appsettings.json`. Locally:

```bash
cd src/Starter.Api
dotnet user-secrets set "Jwt:Secret" "<a long random string>"
dotnet user-secrets set "Seed:AdminPassword" "<a strong password>"
```

In production use environment variables, e.g. `Jwt__Secret`, `Seed__AdminPassword`.

## Switching to SQL Server

1. Set `Database:Provider` to `SqlServer`.
2. Set `ConnectionStrings:Default` to your SQL Server connection string.

That's it while the project has no migrations: the schema is created on start.

## Migrations

Until the first migration exists, the app creates the schema directly from the model (`EnsureCreated`). When the data model of your app settles, switch to migrations for the provider you'll deploy with:

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate --project src/Starter.Infrastructure --startup-project src/Starter.Api --output-dir Data/Migrations
```

From then on the app runs `Migrate()` on start. Delete any old `app.db` first, since it was created without migration history. Migrations are provider-specific: if you change provider later, generate them again for the new one.

## Fixes from the starter

Improvements made later in `dotnet-auth-starter` are ported here by hand, in small pull requests, so this app keeps full control over its own code.
