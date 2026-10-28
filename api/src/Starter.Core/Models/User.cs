namespace Starter.Core.Models;

public class User
{
    public int Id { get; set; }

    public required string Username { get; set; }

    // Upper-invariant copy used for case-insensitive uniqueness and lookups.
    public required string NormalizedUsername { get; set; }

    public required string Email { get; set; }
    public required string NormalizedEmail { get; set; }

    // Only the BCrypt hash is stored, never the password.
    public required string PasswordHash { get; set; }

    // Soft delete: a deactivated user keeps their history but cannot sign in,
    // and any token they already hold stops passing authorization.
    public bool IsActive { get; set; } = true;

    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public List<UserRole> UserRoles { get; set; } = new();
}
