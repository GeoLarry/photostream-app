using Microsoft.EntityFrameworkCore;
using Starter.Core.Enums;
using Starter.Core.Interfaces;
using Starter.Infrastructure.Data;

namespace Starter.Infrastructure.Services;

public class PermissionService(AppDbContext db) : IPermissionService
{
    public async Task<HashSet<(PermissionModule Module, PermissionAction Action)>> GetEffectivePermissionsAsync(int userId, CancellationToken ct = default)
    {
        var pairs = await db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId && ur.User.IsActive)
            .SelectMany(ur => ur.Role.Permissions)
            .Select(p => new { p.Module, p.Action })
            .Distinct()
            .ToListAsync(ct);

        return pairs.Select(p => (p.Module, p.Action)).ToHashSet();
    }
}
