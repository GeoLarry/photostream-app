namespace Starter.Core.Enums;

// Actions that can be allowed on a PermissionModule.
// There is deliberately no "Manage/Full" action: granting all four covers it.
// Module-specific actions (e.g. Export) can be added as new members.
public enum PermissionAction
{
    View,
    Create,
    Edit,
    Delete
}
