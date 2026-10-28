using Microsoft.EntityFrameworkCore;
using Starter.Core.Contracts;
using Starter.Core.Enums;
using Starter.Core.Exceptions;
using Starter.Core.Interfaces;
using Starter.Core.Models;
using Starter.Infrastructure.Data;

namespace Starter.Infrastructure.Services;

public class AuthService(AppDbContext db, ITokenService tokenService, IPermissionService permissionService) : IAuthService
{
    // Hash of a random password, compared against when the username does not exist,
    // so a login for an unknown user takes as long as one for a known user.
    private static readonly string DummyPasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
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

        // Public sign-up always gets the lowest role. Admins assign anything more.
        int defaultRoleId = await db.Roles
            .Where(r => r.Name == SystemRoles.DefaultSelfRegister)
            .Select(r => r.Id)
            .SingleAsync(ct);

        User user = new()
        {
            Username = request.Username,
            NormalizedUsername = normalizedUsername,
            Email = request.Email,
            NormalizedEmail = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = InputRules.Clean(request.FirstName),
            LastName = InputRules.Clean(request.LastName),
            UserRoles = [new UserRole { RoleId = defaultRoleId }]
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return await BuildAuthResponseAsync(user.Id, ct);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrEmpty(request.Password))
            return null;

        // Sign in with either the username or the email.
        string normalized = request.Username.Trim().ToUpperInvariant();
        User? user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.NormalizedUsername == normalized || u.NormalizedEmail == normalized, ct);

        bool passwordMatches = BCrypt.Net.BCrypt.Verify(request.Password, user?.PasswordHash ?? DummyPasswordHash);

        // Wrong credentials and a deactivated account return the same result on purpose.
        if (user is null || !passwordMatches || !user.IsActive)
            return null;

        return await BuildAuthResponseAsync(user.Id, ct);
    }

    public async Task<CurrentUserDto?> GetCurrentUserAsync(int userId, CancellationToken ct = default)
    {
        User? user = await db.Users
            .AsNoTracking()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, ct);

        if (user is null) return null;

        HashSet<(PermissionModule Module, PermissionAction Action)> permissions =
            await permissionService.GetEffectivePermissionsAsync(user.Id, ct);

        List<RoleSummaryDto> roles = user.UserRoles
            .Select(ur => new RoleSummaryDto(ur.Role.Id, ur.Role.Name))
            .OrderBy(r => r.Name)
            .ToList();

        List<string> permissionStrings = permissions
            .Select(p => $"{p.Module}.{p.Action}")
            .Order()
            .ToList();

        return new CurrentUserDto(user.Id, user.Username, user.Email, user.FirstName, user.LastName, roles, permissionStrings);
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(int userId, CancellationToken ct)
    {
        User user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId, ct);
        CurrentUserDto currentUser = (await GetCurrentUserAsync(userId, ct))!;
        (string token, DateTime expiresAtUtc) = tokenService.CreateToken(user);
        return new AuthResponse(token, expiresAtUtc, currentUser);
    }
}
