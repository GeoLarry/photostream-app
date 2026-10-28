using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Starter.Core.Enums;
using Starter.Core.Interfaces;

namespace Starter.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor, IPermissionService permissionService) : ICurrentUserService
{
    // Cached for the request, so repeated checks hit the database once.
    private HashSet<(PermissionModule Module, PermissionAction Action)>? _permissions;

    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public int? UserId =>
        int.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out int id) ? id : null;

    public string? Username => Principal?.FindFirstValue(ClaimTypes.Name);

    public async Task<bool> HasPermissionAsync(PermissionModule module, PermissionAction action, CancellationToken ct = default)
    {
        if (UserId is not int userId) return false;

        _permissions ??= await permissionService.GetEffectivePermissionsAsync(userId, ct);
        return _permissions.Contains((module, action));
    }
}
