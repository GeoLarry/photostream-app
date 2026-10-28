using Starter.Core.Authorization;
using Starter.Core.Enums;

namespace Starter.Api.Extensions;

public static class EndpointAuthorizationExtensions
{
    // .RequirePermission(PermissionModule.Users, PermissionAction.Edit) on any endpoint:
    // 401 without a valid token, 403 when the user's roles lack the permission.
    public static RouteHandlerBuilder RequirePermission(this RouteHandlerBuilder builder, PermissionModule module, PermissionAction action)
        => builder.RequireAuthorization(policy => policy.AddRequirements(new PermissionRequirement(module, action)));
}
