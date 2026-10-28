using Starter.Core.Enums;

namespace Starter.Core.Contracts;

public record RolePermissionDto(PermissionModule Module, PermissionAction Action);

public record RoleResponse(
    int Id,
    string Name,
    string? Description,
    bool IsSystemRole,
    bool IsAssignable,
    bool IsImmutable,
    int UserCount,
    IReadOnlyList<RolePermissionDto> Permissions);

public record CreateRoleRequest(string Name, string? Description, List<RolePermissionDto> Permissions);

public record UpdateRoleRequest(string Name, string? Description, List<RolePermissionDto> Permissions);

// Everything a role editor UI needs to render the permission matrix.
public record PermissionCatalogResponse(IReadOnlyList<string> Modules, IReadOnlyList<string> Actions);
