namespace Starter.Core.Models;

public class Role
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }

    // Built-in role (e.g. Administrator) that cannot be deleted, to avoid locking everyone out.
    public bool IsSystemRole { get; set; }

    // false = can never be assigned through the API (e.g. Super Admin). Only the seeder assigns it.
    public bool IsAssignable { get; set; } = true;

    // true = the permission set can never change through the API, by anyone.
    public bool IsImmutable { get; set; }

    public List<RolePermission> Permissions { get; set; } = new();
    public List<UserRole> UserRoles { get; set; } = new();
}
