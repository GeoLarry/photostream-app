using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Models;

namespace Starter.Core.Interfaces;

public interface IAuthService
{
    // Creates an unconfirmed account and emails a confirmation link. No token is issued.
    // Throws ValidationFailedException on invalid input or a taken username/email.
    Task RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    // Wrong credentials and a deactivated account give the same InvalidCredentials outcome.
    // EmailNotConfirmed is only returned when the password is correct.
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    // Confirms the email from the emailed link and signs the user in.
    // null if the token is unknown, already used or expired.
    Task<AuthResponse?> ConfirmEmailAsync(string token, CancellationToken ct = default);

    // Sends a new link if the email belongs to an active, unconfirmed account. Does nothing otherwise,
    // so callers cannot find out which addresses are registered.
    Task ResendConfirmationAsync(string email, CancellationToken ct = default);

    // null if the user no longer exists or is deactivated.
    Task<CurrentUserDto?> GetCurrentUserAsync(int userId, CancellationToken ct = default);
}

public interface IUserService
{
    Task<PagedResponse<UserResponse>> GetUsersAsync(int pageNumber, int pageSize, string? search, CancellationToken ct = default);
    Task<UserResponse?> GetUserByIdAsync(int id, CancellationToken ct = default);
    Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserResponse?> UpdateUserAsync(int id, UpdateUserRequest request, CancellationToken ct = default);
    Task<bool> DeactivateUserAsync(int id, CancellationToken ct = default);
    Task<bool> ReactivateUserAsync(int id, CancellationToken ct = default);

    // Marks the email as confirmed, e.g. when the user never got the email. false if not found.
    Task<bool> ConfirmEmailAsync(int id, CancellationToken ct = default);

    // true if the user holds a role that can never be assigned through the API (Super Admin).
    // Such accounts can only be edited by callers with the System.Edit permission.
    Task<bool> IsProtectedUserAsync(int id, CancellationToken ct = default);
}

public interface IRoleService
{
    Task<IReadOnlyList<RoleResponse>> GetAllRolesAsync(CancellationToken ct = default);
    Task<RoleResponse?> GetRoleByIdAsync(int id, CancellationToken ct = default);
    Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken ct = default);

    // null if not found. Throws ValidationFailedException for an immutable role,
    // or a system role when the caller lacks System.Edit.
    Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request, bool callerCanEditSystemRoles, CancellationToken ct = default);

    Task<RoleDeleteResult> DeleteRoleAsync(int id, CancellationToken ct = default);
}

public interface IFavoriteService
{
    // Newest first.
    Task<IReadOnlyList<FavoriteResponse>> GetFavoritesAsync(int userId, CancellationToken ct = default);

    // Idempotent: adding a photo that is already a favorite returns the existing one.
    // Throws ValidationFailedException on invalid input.
    Task<FavoriteResponse> AddFavoriteAsync(int userId, string photoId, AddFavoriteRequest request, CancellationToken ct = default);

    // false if the photo was not a favorite.
    Task<bool> RemoveFavoriteAsync(int userId, string photoId, CancellationToken ct = default);
}

public interface IEmailConfirmationService
{
    // Replaces any earlier link with a new one and emails it. Skipped (silently) when the last link
    // was sent less than the resend cooldown ago. A failure to send is logged, not thrown,
    // because the account already exists and the user can ask for another link.
    Task SendConfirmationAsync(User user, CancellationToken ct = default);

    // Marks the user's email as confirmed and invalidates their links.
    // Returns the user id, or null if the token is unknown or expired.
    Task<int?> ConfirmAsync(string token, CancellationToken ct = default);
}

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}

public interface IPermissionService
{
    // Union of the permissions of all the user's roles, read from the database on every call,
    // so role changes and deactivation apply immediately, even to tokens already issued.
    // Empty set for a missing or deactivated user.
    Task<HashSet<(PermissionModule Module, PermissionAction Action)>> GetEffectivePermissionsAsync(int userId, CancellationToken ct = default);
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}

// Resolves "who is calling" from the JWT of the current request. Scoped, once per request.
public interface ICurrentUserService
{
    int? UserId { get; }
    string? Username { get; }
    bool IsAuthenticated { get; }
    Task<bool> HasPermissionAsync(PermissionModule module, PermissionAction action, CancellationToken ct = default);
}
