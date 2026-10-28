using Microsoft.EntityFrameworkCore;
using Starter.Core.Contracts;
using Starter.Core.Exceptions;
using Starter.Core.Interfaces;
using Starter.Core.Models;
using Starter.Infrastructure.Data;

namespace Starter.Infrastructure.Services;

public class UserService(AppDbContext db) : IUserService
{
    private const int MaxPageSize = 100;

    public async Task<PagedResponse<UserResponse>> GetUsersAsync(int pageNumber, int pageSize, string? search, CancellationToken ct = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        IQueryable<User> query = db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            string term = search.Trim().ToUpperInvariant();
            query = query.Where(u =>
                u.NormalizedUsername.Contains(term) ||
                u.NormalizedEmail.Contains(term) ||
                (u.FirstName != null && u.FirstName.ToUpper().Contains(term)) ||
                (u.LastName != null && u.LastName.ToUpper().Contains(term)));
        }

        int totalCount = await query.CountAsync(ct);

        List<User> users = await query
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Username)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .AsSplitQuery()
            .ToListAsync(ct);

        return new PagedResponse<UserResponse>(users.Select(ToResponse).ToList(), totalCount, pageNumber, pageSize);
    }

    public async Task<UserResponse?> GetUserByIdAsync(int id, CancellationToken ct = default)
    {
        User? user = await LoadUserAsync(id, tracking: false, ct);
        return user is null ? null : ToResponse(user);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        InputRules.Username(request.Username);
        InputRules.Email(request.Email);
        InputRules.Password(request.Password);
        InputRules.OptionalName(request.FirstName, "First name");
        InputRules.OptionalName(request.LastName, "Last name");

        string normalizedUsername = request.Username.ToUpperInvariant();
        string normalizedEmail = request.Email.ToUpperInvariant();

        if (await db.Users.AnyAsync(u => u.NormalizedUsername == normalizedUsername, ct))
            throw new ValidationFailedException("This username is already taken.");

        if (await db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail, ct))
            throw new ValidationFailedException("This email is already registered.");

        List<int> roleIds = await ValidateAssignableRolesAsync(request.RoleIds, ct);

        User user = new()
        {
            Username = request.Username,
            NormalizedUsername = normalizedUsername,
            Email = request.Email,
            NormalizedEmail = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = InputRules.Clean(request.FirstName),
            LastName = InputRules.Clean(request.LastName),
            UserRoles = roleIds.Select(roleId => new UserRole { RoleId = roleId }).ToList()
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return (await GetUserByIdAsync(user.Id, ct))!;
    }

    public async Task<UserResponse?> UpdateUserAsync(int id, UpdateUserRequest request, CancellationToken ct = default)
    {
        User? user = await LoadUserAsync(id, tracking: true, ct);
        if (user is null) return null;

        InputRules.Email(request.Email);
        InputRules.OptionalName(request.FirstName, "First name");
        InputRules.OptionalName(request.LastName, "Last name");
        if (!string.IsNullOrEmpty(request.Password)) InputRules.Password(request.Password);

        string normalizedEmail = request.Email.ToUpperInvariant();
        if (await db.Users.AnyAsync(u => u.Id != id && u.NormalizedEmail == normalizedEmail, ct))
            throw new ValidationFailedException("This email is already registered.");

        List<int> requestedRoleIds = await ValidateAssignableRolesAsync(request.RoleIds, ct);

        // Roles that can never be assigned through the API (Super Admin) are kept as they are,
        // so editing that account cannot strip them by accident.
        List<int> protectedRoleIds = user.UserRoles
            .Where(ur => !ur.Role.IsAssignable)
            .Select(ur => ur.RoleId)
            .ToList();

        HashSet<int> finalRoleIds = requestedRoleIds.Concat(protectedRoleIds).ToHashSet();

        user.UserRoles.RemoveAll(ur => !finalRoleIds.Contains(ur.RoleId));
        foreach (int roleId in finalRoleIds.Where(roleId => user.UserRoles.All(ur => ur.RoleId != roleId)))
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });

        user.Email = request.Email;
        user.NormalizedEmail = normalizedEmail;
        user.FirstName = InputRules.Clean(request.FirstName);
        user.LastName = InputRules.Clean(request.LastName);

        if (!string.IsNullOrEmpty(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await db.SaveChangesAsync(ct);

        return await GetUserByIdAsync(id, ct);
    }

    public async Task<bool> DeactivateUserAsync(int id, CancellationToken ct = default)
    {
        User? user = await LoadUserAsync(id, tracking: true, ct);
        if (user is null) return false;

        if (user.UserRoles.Any(ur => !ur.Role.IsAssignable))
            throw new ValidationFailedException("This account holds a protected role and cannot be deactivated.");

        user.IsActive = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReactivateUserAsync(int id, CancellationToken ct = default)
    {
        User? user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return false;

        user.IsActive = true;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> IsProtectedUserAsync(int id, CancellationToken ct = default) =>
        db.UserRoles.AnyAsync(ur => ur.UserId == id && !ur.Role.IsAssignable, ct);

    // Every role must exist and be assignable (never Super Admin). At least one role is required.
    private async Task<List<int>> ValidateAssignableRolesAsync(List<int>? roleIds, CancellationToken ct)
    {
        List<int> distinctIds = (roleIds ?? []).Distinct().ToList();
        if (distinctIds.Count == 0)
            throw new ValidationFailedException("At least one role is required.");

        List<Role> roles = await db.Roles.AsNoTracking().Where(r => distinctIds.Contains(r.Id)).ToListAsync(ct);

        if (roles.Count != distinctIds.Count)
            throw new ValidationFailedException("One or more roles do not exist.");

        Role? nonAssignable = roles.FirstOrDefault(r => !r.IsAssignable);
        if (nonAssignable is not null)
            throw new ValidationFailedException($"The role '{nonAssignable.Name}' cannot be assigned.");

        return distinctIds;
    }

    private Task<User?> LoadUserAsync(int id, bool tracking, CancellationToken ct)
    {
        IQueryable<User> query = db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role);
        if (!tracking) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    private static UserResponse ToResponse(User user) => new(
        user.Id,
        user.Username,
        user.Email,
        user.FirstName,
        user.LastName,
        user.IsActive,
        user.CreatedAtUtc,
        user.UserRoles
            .Select(ur => new RoleSummaryDto(ur.Role.Id, ur.Role.Name))
            .OrderBy(r => r.Name)
            .ToList());
}
