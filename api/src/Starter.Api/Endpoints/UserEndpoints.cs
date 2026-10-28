using Starter.Api.Extensions;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Interfaces;

namespace Starter.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/users").WithTags("Users");

        group.MapGet("/", async (IUserService userService, CancellationToken ct, int pageNumber = 1, int pageSize = 25, string? search = null) =>
        {
            PagedResponse<UserResponse> page = await userService.GetUsersAsync(pageNumber, pageSize, search, ct);
            return Results.Ok(page);
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.View);

        group.MapGet("/{id:int}", async (int id, IUserService userService, CancellationToken ct) =>
        {
            UserResponse? user = await userService.GetUserByIdAsync(id, ct);
            return user is null ? NotFound() : Results.Ok(user);
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.View);

        group.MapGet("/{id:int}/favorites", async (int id, IUserService userService, IFavoriteService favoriteService, CancellationToken ct) =>
        {
            if (await userService.GetUserByIdAsync(id, ct) is null) return NotFound();

            IReadOnlyList<FavoriteResponse> favorites = await favoriteService.GetFavoritesAsync(id, ct);
            return Results.Ok(favorites);
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.View);

        group.MapPost("/", async (CreateUserRequest request, IUserService userService, CancellationToken ct) =>
        {
            UserResponse user = await userService.CreateUserAsync(request, ct);
            return Results.Created($"/api/users/{user.Id}", user);
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.Create);

        group.MapPut("/{id:int}", async (int id, UpdateUserRequest request, IUserService userService, ICurrentUserService currentUser, CancellationToken ct) =>
        {
            if (await IsProtectedFromCallerAsync(id, userService, currentUser, ct)) return Results.Forbid();

            UserResponse? user = await userService.UpdateUserAsync(id, request, ct);
            return user is null ? NotFound() : Results.Ok(user);
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.Edit);

        // Soft delete: the account is deactivated, not removed. Nobody can deactivate themselves.
        group.MapDelete("/{id:int}", async (int id, IUserService userService, ICurrentUserService currentUser, CancellationToken ct) =>
        {
            if (currentUser.UserId == id)
                return Results.BadRequest(new { message = "You cannot deactivate your own account." });

            bool found = await userService.DeactivateUserAsync(id, ct);
            return found ? Results.Ok(new { message = "User deactivated." }) : NotFound();
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.Delete);

        group.MapPost("/{id:int}/reactivate", async (int id, IUserService userService, CancellationToken ct) =>
        {
            bool found = await userService.ReactivateUserAsync(id, ct);
            return found ? Results.Ok(new { message = "User reactivated." }) : NotFound();
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.Edit);

        // For a user who never received the confirmation email.
        group.MapPost("/{id:int}/confirm-email", async (int id, IUserService userService, CancellationToken ct) =>
        {
            bool found = await userService.ConfirmEmailAsync(id, ct);
            return found ? Results.Ok(new { message = "Email confirmed." }) : NotFound();
        })
        .RequirePermission(PermissionModule.Users, PermissionAction.Edit);
    }

    // An account with a protected role (Super Admin) can only be edited by a caller with System.Edit,
    // so an Administrator cannot take it over, e.g. by changing its password.
    private static async Task<bool> IsProtectedFromCallerAsync(int targetUserId, IUserService userService, ICurrentUserService currentUser, CancellationToken ct)
    {
        if (currentUser.UserId == targetUserId) return false;
        if (!await userService.IsProtectedUserAsync(targetUserId, ct)) return false;
        return !await currentUser.HasPermissionAsync(PermissionModule.System, PermissionAction.Edit, ct);
    }

    private static IResult NotFound() => Results.NotFound(new { message = "User not found." });
}
