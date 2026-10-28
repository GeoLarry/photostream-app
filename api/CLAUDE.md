# dotnet-auth-starter: .NET 10 Minimal API

Starter backend with JWT authentication, users, roles and permissions. New apps are created from this template and add their own modules on top.

## Architecture & style
- **Minimal API only.** No controllers, no `ControllerBase`, no `[ApiController]`.
- **Endpoints** live in extension methods under `src/Starter.Api/Endpoints/` (e.g. `MapUserEndpoints(this IEndpointRouteBuilder app)`), grouped with `MapGroup`, and are mapped in `Program.cs`.
- **Route handlers stay small**: they call a service and turn the result into an `IResult`. Logic belongs in services.
- **Projects:** `Starter.Core` (models, contracts, interfaces, enums, no EF), `Starter.Infrastructure` (EF Core, services, seeding, auth wiring), `Starter.Api` (endpoints, Program.cs).
- Use explicit types; `var` only for anonymous types or where the type is obvious.

## Auth & permissions
- Permissions are `(PermissionModule, PermissionAction)` pairs, granted to roles. A user's permissions are the union of their roles.
- Protect an endpoint with `.RequirePermission(PermissionModule.X, PermissionAction.Y)`.
- Permissions are read from the database on every request (`IPermissionService`), never from token claims, so role changes and deactivation apply immediately.
- To add a module for a new feature: add a member to `PermissionModule`, then protect its endpoints. Administrator gets new modules automatically on a fresh database.
- `System` permissions belong only to the seeded Super Admin role and cannot be granted through the API.

## Errors
- Services throw `ValidationFailedException` for bad input or broken rules. `ValidationExceptionHandler` turns it into `400 { "message": "..." }`. Do not add try/catch in endpoints for this.
- Not found: return `null` / `false` from the service and `404 { message }` from the endpoint.

## Data
- EF Core with SQLite by default; SQL Server via `Database:Provider = SqlServer` and the `Default` connection string.
- Before migrations exist the schema is created with `EnsureCreated`; after `dotnet ef migrations add` the app migrates on start.
- **Bogus** generates demo data in `DbInitializer` (Development only, `Seed:DemoUsers`). New seeders follow the same pattern: `Faker` with a fixed seed, only on an empty table.

## Testing
- Integration tests in `tests/Starter.Api.Tests` use `WebApplicationFactory<Program>` with a private in-memory SQLite database per test class.
- Every new endpoint gets at least one success test and one permission test (403 for a user without the permission).
