namespace Starter.Core.Contracts;

public record UserResponse(
    int Id,
    string Username,
    string Email,
    string? FirstName,
    string? LastName,
    bool IsActive,
    bool EmailConfirmed,
    DateTime CreatedAtUtc,
    IReadOnlyList<RoleSummaryDto> Roles);

// Admin-created user: any assignable role can be given (never Super Admin).
public record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    List<int> RoleIds,
    string? FirstName,
    string? LastName);

// Username is immutable (natural key). A null or empty Password means "leave unchanged".
public record UpdateUserRequest(
    string Email,
    List<int> RoleIds,
    string? FirstName,
    string? LastName,
    string? Password);
