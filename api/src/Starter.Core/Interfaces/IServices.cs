using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Models;

namespace Starter.Core.Interfaces;

public interface IAuthService
{
    // Throws ValidationFailedException on invalid input or a taken username/email.
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    // null on wrong credentials or a deactivated account (same result, not distinguishable).
    Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);

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
