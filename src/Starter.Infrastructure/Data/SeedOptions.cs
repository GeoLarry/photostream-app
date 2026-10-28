namespace Starter.Infrastructure.Data;

public class SeedOptions
{
    public const string SectionName = "Seed";

    // The first admin is created only when the database has no users yet.
    // If AdminPassword is empty, no admin is created and a warning is logged.
    public string AdminUsername { get; set; } = "admin";
    public string AdminEmail { get; set; } = "admin@example.com";
    public string? AdminPassword { get; set; }

    // Fake users generated with Bogus for local development and demos.
    public int DemoUsers { get; set; }
    public string DemoPassword { get; set; } = "Demo123!";
}
