using Starter.Api.Extensions;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Interfaces;

namespace Starter.Api.Endpoints;

public static class RoleEndpoints
{
    public static void MapRoleEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/roles").WithTags("Roles");

        group.MapGet("/", async (IRoleService roleService, CancellationToken ct) =>
        {
            IReadOnlyList<RoleResponse> roles = await roleService.GetAllRolesAsync(ct);
            return Results.Ok(roles);
        })
        .RequirePermission(PermissionModule.Roles, PermissionAction.View);

        group.MapGet("/{id:int}", async (int id, IRoleService roleService, CancellationToken ct) =>
        {
            RoleResponse? role = await roleService.GetRoleByIdAsync(id, ct);
            return role is null ? NotFound() : Results.Ok(role);
        })
        .RequirePermission(PermissionModule.Roles, PermissionAction.View);

        group.MapPost("/", async (CreateRoleRequest request, IRoleService roleService, CancellationToken ct) =>
        {
            RoleResponse role = await roleService.CreateRoleAsync(request, ct);
            return Results.Created($"/api/roles/{role.Id}", role);
        })
        .RequirePermission(PermissionModule.Roles, PermissionAction.Create);

        // System roles (e.g. Administrator) can only be edited with System.Edit.
        // Super Admin is immutable and can never be edited.
        group.MapPut("/{id:int}", async (int id, UpdateRoleRequest request, IRoleService roleService, ICurrentUserService currentUser, CancellationToken ct) =>
        {
            bool callerCanEditSystemRoles = await currentUser.HasPermissionAsync(PermissionModule.System, PermissionAction.Edit, ct);

            RoleResponse? role = await roleService.UpdateRoleAsync(id, request, callerCanEditSystemRoles, ct);
            return role is null ? NotFound() : Results.Ok(role);
        })
        .RequirePermission(PermissionModule.Roles, PermissionAction.Edit);

        group.MapDelete("/{id:int}", async (int id, IRoleService roleService, CancellationToken ct) =>
        {
            RoleDeleteResult result = await roleService.DeleteRoleAsync(id, ct);

            return result switch
            {
                RoleDeleteResult.NotFound => NotFound(),
                RoleDeleteResult.IsSystemRole => Results.BadRequest(new { message = "Built-in roles cannot be deleted." }),
                RoleDeleteResult.InUse => Results.Conflict(new { message = "The role is still assigned to users and cannot be deleted." }),
                _ => Results.Ok(new { message = "Role deleted." })
            };
        })
        .RequirePermission(PermissionModule.Roles, PermissionAction.Delete);

        // The modules and actions a role editor can grant. System is left out: it cannot be granted through the API.
        app.MapGet("/api/permissions", () =>
        {
            List<string> modules = Enum.GetNames<PermissionModule>()
                .Where(name => name != nameof(PermissionModule.System))
                .ToList();
            List<string> actions = Enum.GetNames<PermissionAction>().ToList();
            return Results.Ok(new PermissionCatalogResponse(modules, actions));
        })
        .WithTags("Roles")
        .RequirePermission(PermissionModule.Roles, PermissionAction.View);
    }

    private static IResult NotFound() => Results.NotFound(new { message = "Role not found." });
}
