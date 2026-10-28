using Microsoft.EntityFrameworkCore;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Exceptions;
using Starter.Core.Interfaces;
using Starter.Core.Models;
using Starter.Infrastructure.Data;

namespace Starter.Infrastructure.Services;

public class RoleService(AppDbContext db) : IRoleService
{
    public async Task<IReadOnlyList<RoleResponse>> GetAllRolesAsync(CancellationToken ct = default)
    {
        return await db.Roles
            .AsNoTracking()
            .OrderBy(r => r.Id)
            .Select(ToResponseExpression)
            .ToListAsync(ct);
    }

    public async Task<RoleResponse?> GetRoleByIdAsync(int id, CancellationToken ct = default)
    {
        return await db.Roles
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(ToResponseExpression)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken ct = default)
    {
        string name = ValidateName(request.Name);
        ValidateDescription(request.Description);
        await EnsureNameIsFreeAsync(name, excludeRoleId: null, ct);

        // Roles created through the API are never system, protected or immutable:
        // only the seeder creates those.
        Role role = new()
        {
            Name = name,
            Description = InputRules.Clean(request.Description),
            Permissions = ToPermissions(request.Permissions)
        };

        db.Roles.Add(role);
        await db.SaveChangesAsync(ct);

        return (await GetRoleByIdAsync(role.Id, ct))!;
    }

    public async Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request, bool callerCanEditSystemRoles, CancellationToken ct = default)
    {
        Role? role = await db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return null;

        if (role.IsImmutable)
            throw new ValidationFailedException($"The role '{role.Name}' cannot be changed.");

        if (role.IsSystemRole && !callerCanEditSystemRoles)
            throw new ValidationFailedException($"The role '{role.Name}' is a system role and can only be changed with the System.Edit permission.");

        string name = ValidateName(request.Name);
        ValidateDescription(request.Description);

        // System role names are referenced by the seeder and services, so they stay fixed.
        if (role.IsSystemRole && !string.Equals(name, role.Name, StringComparison.Ordinal))
            throw new ValidationFailedException("System roles cannot be renamed.");

        await EnsureNameIsFreeAsync(name, excludeRoleId: id, ct);

        role.Name = name;
        role.Description = InputRules.Clean(request.Description);

        // Apply only the difference: removing a pair and adding the same pair back
        // in one save would make EF Core track two entities with the same key.
        HashSet<(PermissionModule Module, PermissionAction Action)> desired = ToPermissions(request.Permissions)
            .Select(p => (p.Module, p.Action))
            .ToHashSet();

        role.Permissions.RemoveAll(p => !desired.Contains((p.Module, p.Action)));
        foreach ((PermissionModule module, PermissionAction action) in desired.Where(d => !role.Permissions.Any(p => p.Module == d.Module && p.Action == d.Action)).ToList())
            role.Permissions.Add(new RolePermission { RoleId = role.Id, Module = module, Action = action });

        await db.SaveChangesAsync(ct);

        return await GetRoleByIdAsync(id, ct);
    }

    public async Task<RoleDeleteResult> DeleteRoleAsync(int id, CancellationToken ct = default)
    {
        Role? role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return RoleDeleteResult.NotFound;

        // No exceptions, not even for Super Admin: built-in roles can never be deleted.
        if (role.IsSystemRole || role.IsImmutable) return RoleDeleteResult.IsSystemRole;

        if (await db.UserRoles.AnyAsync(ur => ur.RoleId == id, ct)) return RoleDeleteResult.InUse;

        db.Roles.Remove(role);
        await db.SaveChangesAsync(ct);
        return RoleDeleteResult.Success;
    }

    private static string ValidateName(string? name)
    {
        string? cleaned = InputRules.Clean(name);
        if (cleaned is null || cleaned.Length > 100)
            throw new ValidationFailedException("Role name is required and must be at most 100 characters.");
        return cleaned;
    }

    private static void ValidateDescription(string? description)
    {
        if (description is not null && description.Length > 500)
            throw new ValidationFailedException("Description must be at most 500 characters.");
    }

    private async Task EnsureNameIsFreeAsync(string name, int? excludeRoleId, CancellationToken ct)
    {
        string upper = name.ToUpperInvariant();
        bool taken = await db.Roles.AnyAsync(r => r.Id != excludeRoleId && r.Name.ToUpper() == upper, ct);
        if (taken) throw new ValidationFailedException("A role with this name already exists.");
    }

    // System permissions are reserved for the seeded Super Admin role, so nobody can
    // escalate by putting them into a role they create or edit.
    private static List<RolePermission> ToPermissions(List<RolePermissionDto>? permissions)
    {
        List<RolePermissionDto> distinct = (permissions ?? []).Distinct().ToList();

        if (distinct.Any(p => !Enum.IsDefined(p.Module) || !Enum.IsDefined(p.Action)))
            throw new ValidationFailedException("One or more permissions are not valid.");

        if (distinct.Any(p => p.Module == PermissionModule.System))
            throw new ValidationFailedException("System permissions cannot be granted through the API.");

        return distinct.Select(p => new RolePermission { Module = p.Module, Action = p.Action }).ToList();
    }

    private static readonly System.Linq.Expressions.Expression<Func<Role, RoleResponse>> ToResponseExpression = r => new RoleResponse(
        r.Id,
        r.Name,
        r.Description,
        r.IsSystemRole,
        r.IsAssignable,
        r.IsImmutable,
        r.UserRoles.Count,
        r.Permissions
            .OrderBy(p => p.Module).ThenBy(p => p.Action)
            .Select(p => new RolePermissionDto(p.Module, p.Action))
            .ToList());
}
