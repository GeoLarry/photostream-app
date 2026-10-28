using Starter.Core.Contracts;
using Starter.Core.Interfaces;

namespace Starter.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService authService, CancellationToken ct) =>
        {
            AuthResponse response = await authService.RegisterAsync(request, ct);
            return Results.Ok(response);
        })
        .AllowAnonymous();

        group.MapPost("/login", async (LoginRequest request, IAuthService authService, CancellationToken ct) =>
        {
            AuthResponse? response = await authService.LoginAsync(request, ct);
            return response is null ? Results.Unauthorized() : Results.Ok(response);
        })
        .AllowAnonymous();

        // The signed-in user with fresh roles and permissions, e.g. for the frontend after a page reload.
        group.MapGet("/me", async (ICurrentUserService currentUser, IAuthService authService, CancellationToken ct) =>
        {
            if (currentUser.UserId is not int userId) return Results.Unauthorized();

            CurrentUserDto? user = await authService.GetCurrentUserAsync(userId, ct);
            return user is null ? Results.Unauthorized() : Results.Ok(user);
        })
        .RequireAuthorization();
    }
}
