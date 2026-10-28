namespace Starter.Core.Models;

// Join entity: a user can hold several roles and their permissions are the union of all of them.
public class UserRole
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
}
