using Starter.Core.Enums;

namespace Starter.Core.Models;

// A single permission: one (Module, Action) pair granted to a role.
public class RolePermission
{
    public int RoleId { get; set; }
    public PermissionModule Module { get; set; }
    public PermissionAction Action { get; set; }
}
