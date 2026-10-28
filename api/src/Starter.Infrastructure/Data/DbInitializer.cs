using Bogus;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Starter.Core.Enums;
using Starter.Core.Models;

namespace Starter.Infrastructure.Data;

public static class DbInitializer
{
    // Creates or migrates the database, then seeds roles, the first admin and demo users.
    // Safe to run on every start: each step only runs when its data is missing.
    public static async Task InitializeAsync(IServiceProvider services, CancellationToken ct = default)
    {
        using IServiceScope scope = services.CreateScope();
        AppDbContext db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        SeedOptions seed = scope.ServiceProvider.GetRequiredService<IOptions<SeedOptions>>().Value;
        ILogger logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbInitializer));

        // Before the first migration exists, create the schema straight from the model.
        // Once you add migrations (see README), the database is migrated instead.
        if (db.Database.GetMigrations().Any())
            await db.Database.MigrateAsync(ct);
        else
            await db.Database.EnsureCreatedAsync(ct);

        await SeedRolesAsync(db, ct);
        await SeedAdminAsync(db, seed, logger, ct);
        await SeedDemoUsersAsync(db, seed, ct);
    }

    private static async Task SeedRolesAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Roles.AnyAsync(ct)) return;

        // Administrator gets every (Module, Action) pair except System, built dynamically
        // so modules added later are included without touching this code.
        List<RolePermission> administratorPermissions = Enum.GetValues<PermissionModule>()
            .Where(module => module != PermissionModule.System)
            .SelectMany(module => Enum.GetValues<PermissionAction>()
                .Select(action => new RolePermission { Module = module, Action = action }))
            .ToList();

        db.Roles.AddRange(
            new Role
            {
                Name = SystemRoles.SuperAdmin,
                Description = "System-level permissions beyond Administrator. Cannot be assigned or changed by anyone.",
                IsSystemRole = true,
                IsAssignable = false,
                IsImmutable = true,
                Permissions =
                [
                    new RolePermission { Module = PermissionModule.System, Action = PermissionAction.View },
                    new RolePermission { Module = PermissionModule.System, Action = PermissionAction.Edit }
                ]
            },
            new Role
            {
                Name = SystemRoles.Administrator,
                Description = "Full access to every area of the application.",
                IsSystemRole = true,
                Permissions = administratorPermissions
            },
            new Role
            {
                Name = SystemRoles.User,
                Description = "Default role for new sign-ups: keeps their own favorites.",
                IsSystemRole = true,
                Permissions =
                [
                    new RolePermission { Module = PermissionModule.Favorites, Action = PermissionAction.View },
                    new RolePermission { Module = PermissionModule.Favorites, Action = PermissionAction.Create },
                    new RolePermission { Module = PermissionModule.Favorites, Action = PermissionAction.Delete }
                ]
            });

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedAdminAsync(AppDbContext db, SeedOptions seed, ILogger logger, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(ct)) return;

        if (string.IsNullOrWhiteSpace(seed.AdminPassword))
        {
            logger.LogWarning("No users exist and Seed:AdminPassword is not set, so no admin account was created.");
            return;
        }

        List<int> adminRoleIds = await db.Roles
            .Where(r => r.Name == SystemRoles.SuperAdmin || r.Name == SystemRoles.Administrator)
            .Select(r => r.Id)
            .ToListAsync(ct);

        db.Users.Add(new User
        {
            Username = seed.AdminUsername,
            NormalizedUsername = seed.AdminUsername.ToUpperInvariant(),
            Email = seed.AdminEmail,
            NormalizedEmail = seed.AdminEmail.ToUpperInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(seed.AdminPassword),
            FirstName = "System",
            LastName = "Administrator",
            EmailConfirmedAtUtc = DateTime.UtcNow,
            UserRoles = adminRoleIds.Select(roleId => new UserRole { RoleId = roleId }).ToList()
        });

        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedDemoUsersAsync(AppDbContext db, SeedOptions seed, CancellationToken ct)
    {
        if (seed.DemoUsers <= 0) return;

        // Only on a fresh database: the admin is the single existing user.
        if (await db.Users.CountAsync(ct) > 1) return;

        int userRoleId = await db.Roles
            .Where(r => r.Name == SystemRoles.User)
            .Select(r => r.Id)
            .SingleAsync(ct);

        // One hash shared by all demo users: BCrypt is deliberately slow.
        string demoPasswordHash = BCrypt.Net.BCrypt.HashPassword(seed.DemoPassword);

        // Fixed seed so every fresh database gets the same demo users.
        Faker faker = new Faker("en") { Random = new Randomizer(42) };
        HashSet<string> usedUsernames = new(StringComparer.OrdinalIgnoreCase) { seed.AdminUsername };
        List<User> demoUsers = new();

        while (demoUsers.Count < seed.DemoUsers)
        {
            string firstName = faker.Name.FirstName();
            string lastName = faker.Name.LastName();
            string username = faker.Internet.UserName(firstName, lastName).ToLowerInvariant();

            if (username.Length > 50 || !usedUsernames.Add(username)) continue;

            string email = $"{username}@example.com";

            // Same call order as before, so the fixed seed keeps producing the same demo users.
            bool isActive = faker.Random.Bool(0.9f);
            DateTime createdAtUtc = faker.Date.Past(1).ToUniversalTime();

            demoUsers.Add(new User
            {
                Username = username,
                NormalizedUsername = username.ToUpperInvariant(),
                Email = email,
                NormalizedEmail = email.ToUpperInvariant(),
                PasswordHash = demoPasswordHash,
                FirstName = firstName,
                LastName = lastName,
                IsActive = isActive,
                CreatedAtUtc = createdAtUtc,
                EmailConfirmedAtUtc = createdAtUtc,
                UserRoles = [new UserRole { RoleId = userRoleId }]
            });
        }

        db.Users.AddRange(demoUsers);
        await db.SaveChangesAsync(ct);
    }
}
