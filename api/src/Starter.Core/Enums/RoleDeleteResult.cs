namespace Starter.Core.Enums;

// Outcome of a role delete attempt; the endpoint maps it to the right HTTP status.
public enum RoleDeleteResult
{
    Success,
    NotFound,
    IsSystemRole,
    InUse
}
