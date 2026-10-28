using Starter.Api.Extensions;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Interfaces;

namespace Starter.Api.Endpoints;

// The signed-in user's own favorites. Admins see other users' favorites under /api/users/{id}/favorites.
public static class FavoriteEndpoints
{
    public static void MapFavoriteEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/favorites").WithTags("Favorites");

        group.MapGet("/", async (ICurrentUserService currentUser, IFavoriteService favoriteService, CancellationToken ct) =>
        {
            if (currentUser.UserId is not int userId) return Results.Unauthorized();

            IReadOnlyList<FavoriteResponse> favorites = await favoriteService.GetFavoritesAsync(userId, ct);
            return Results.Ok(favorites);
        })
        .RequirePermission(PermissionModule.Favorites, PermissionAction.View);

        // PUT, because adding the same photo again is harmless and returns the same favorite.
        group.MapPut("/{photoId}", async (string photoId, AddFavoriteRequest request, ICurrentUserService currentUser, IFavoriteService favoriteService, CancellationToken ct) =>
        {
            if (currentUser.UserId is not int userId) return Results.Unauthorized();

            FavoriteResponse favorite = await favoriteService.AddFavoriteAsync(userId, photoId, request, ct);
            return Results.Ok(favorite);
        })
        .RequirePermission(PermissionModule.Favorites, PermissionAction.Create);

        group.MapDelete("/{photoId}", async (string photoId, ICurrentUserService currentUser, IFavoriteService favoriteService, CancellationToken ct) =>
        {
            if (currentUser.UserId is not int userId) return Results.Unauthorized();

            bool found = await favoriteService.RemoveFavoriteAsync(userId, photoId, ct);
            return found ? Results.NoContent() : Results.NotFound(new { message = "Favorite not found." });
        })
        .RequirePermission(PermissionModule.Favorites, PermissionAction.Delete);
    }
}
