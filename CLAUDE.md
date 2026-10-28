# Photostream

Full-stack photo gallery: an Angular frontend in `web/` and a .NET 10 Minimal API in `api/`, in one repository.

- `api/`: built from the `dotnet-auth-starter` template (JWT auth, users, roles, permissions, EF Core). Follow `api/CLAUDE.md`.
- `web/`: Angular app (standalone components, signals, zoneless). Follow `web/CLAUDE.md`.

## Working rules
- Keep backend and frontend changes in separate commits, and ideally separate pull requests, unless a feature needs both.
- Each folder has its own CI workflow that runs only when that folder changes.
- Code, comments, commit messages and docs are in English.
- Every change ships with tests: xUnit integration tests in `api/tests`, Angular unit tests next to the code in `web/src`.
