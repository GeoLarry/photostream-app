using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;
using Starter.Core.Models;

namespace Starter.Infrastructure.Services;

public class TokenService(IOptions<JwtSettings> jwtOptions) : ITokenService
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    // The token only identifies the user. Roles and permissions are read from the database
    // on each request, so they are never stale inside a long-lived token.
    public (string Token, DateTime ExpiresAtUtc) CreateToken(User user)
    {
        DateTime expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        List<Claim> claims =
        [
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        ];

        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(_jwt.Secret));

        SecurityTokenDescriptor descriptor = new()
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expiresAtUtc,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
        };

        JwtSecurityTokenHandler handler = new();
        string token = handler.WriteToken(handler.CreateToken(descriptor));
        return (token, expiresAtUtc);
    }
}
