namespace Starter.Core.Enums;

// Areas of the application that permissions can be granted on.
// Each new app built from this starter adds its own modules here (e.g. Photos, Workouts, Contacts).
// Values are stored as strings in the database, so appending or reordering members needs no data migration.
public enum PermissionModule
{
    Users,
    Roles,

    // Each user's own saved photos.
    Favorites,

    // System-level settings, reserved for the Super Admin role.
    System
}
