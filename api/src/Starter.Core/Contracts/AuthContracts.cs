using Starter.Core.Enums;

namespace Starter.Core.Contracts;

// Public self-registration. Roles cannot be requested here: new users always get the default role.
// The account cannot sign in until the email address is confirmed.
public record RegisterRequest(
    string Username,
    string Email,
    string Password,
    string? FirstName,
    string? LastName);

public record LoginRequest(string Username, string Password);

// The token from the link in the confirmation email.
public record ConfirmEmailRequest(string Token);

public record ResendConfirmationRequest(string Email);

public record RoleSummaryDto(int Id, string Name);

// Permissions are flat "Module.Action" strings (e.g. "Users.Edit") so the frontend
// can check them with a simple Set.has() without any mapping layer.
public record CurrentUserDto(
    int Id,
    string Username,
    string Email,
    string? FirstName,
    string? LastName,
    IReadOnlyList<RoleSummaryDto> Roles,
    IReadOnlyList<string> Permissions);

public record AuthResponse(string Token, DateTime ExpiresAtUtc, CurrentUserDto User);

// Response is set only when Outcome is Success.
public record LoginResult(LoginOutcome Outcome, AuthResponse? Response = null);
