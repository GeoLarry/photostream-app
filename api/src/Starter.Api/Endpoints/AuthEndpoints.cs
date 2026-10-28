using Starter.Api.Extensions;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Interfaces;

namespace Starter.Api.Endpoints;

public static class AuthEndpoints
{
    // Same answer whether or not an email was actually sent, so it reveals nothing about which addresses exist.
    private const string CheckEmailMessage = "If the address belongs to an account that still needs confirming, we sent it a link. Check your email.";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/auth").WithTags("Auth");

        // 202: the account exists but stays unusable until the link in the email is opened.
        group.MapPost("/register", async (RegisterRequest request, IAuthService authService, CancellationToken ct) =>
        {
            await authService.RegisterAsync(request, ct);
            return Results.Accepted(value: new { message = "Account created. Check your email to confirm your address." });
        })
        .AllowAnonymous()
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);

        group.MapPost("/login", async (LoginRequest request, IAuthService authService, CancellationToken ct) =>
        {
            LoginResult result = await authService.LoginAsync(request, ct);
            return result.Outcome switch
            {
                LoginOutcome.Success => Results.Ok(result.Response),
                // The code lets the frontend offer "Resend email" without parsing the message.
                LoginOutcome.EmailNotConfirmed => Results.Json(
                    new { message = "Please confirm your email address first.", code = "EmailNotConfirmed" },
                    statusCode: StatusCodes.Status403Forbidden),
                _ => Results.Unauthorized()
            };
        })
        .AllowAnonymous()
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);

        // Opened from the emailed link (through the frontend). Signs the user in on success.
        group.MapPost("/confirm-email", async (ConfirmEmailRequest request, IAuthService authService, CancellationToken ct) =>
        {
            AuthResponse? response = await authService.ConfirmEmailAsync(request.Token, ct);
            return response is null
                ? Results.BadRequest(new { message = "This link is invalid or has expired." })
                : Results.Ok(response);
        })
        .AllowAnonymous()
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);

        group.MapPost("/resend-confirmation", async (ResendConfirmationRequest request, IAuthService authService, CancellationToken ct) =>
        {
            await authService.ResendConfirmationAsync(request.Email, ct);
            return Results.Accepted(value: new { message = CheckEmailMessage });
        })
        .AllowAnonymous()
        .RequireRateLimiting(RateLimitingExtensions.AuthPolicy);

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
