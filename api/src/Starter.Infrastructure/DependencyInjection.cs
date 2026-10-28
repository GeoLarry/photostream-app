using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;
using Starter.Infrastructure.Authorization;
using Starter.Infrastructure.Data;
using Starter.Infrastructure.Services;

namespace Starter.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddOptions<JwtSettings>()
            .BindConfiguration(JwtSettings.SectionName)
            .Validate(jwt => !string.IsNullOrWhiteSpace(jwt.Secret) && jwt.Secret.Length >= 32,
                "Jwt:Secret must be at least 32 characters. Set it with user-secrets or an environment variable.")
            .Validate(jwt => jwt.Secret?.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase) != true,
                "Jwt:Secret still has the placeholder value. Set a real secret.")
            .Validate(jwt => !string.IsNullOrWhiteSpace(jwt.Issuer) && !string.IsNullOrWhiteSpace(jwt.Audience),
                "Jwt:Issuer and Jwt:Audience are required.")
            .ValidateOnStart();

        services.AddOptions<SeedOptions>().BindConfiguration(SeedOptions.SectionName);

        // Database provider chosen by configuration: "Sqlite" (default) or "SqlServer".
        // Read lazily from the service provider so test hosts can override it.
        services.AddDbContext<AppDbContext>((serviceProvider, options) =>
        {
            IConfiguration configuration = serviceProvider.GetRequiredService<IConfiguration>();
            string provider = configuration["Database:Provider"] ?? "Sqlite";
            string connectionString = configuration.GetConnectionString("Default") ?? "Data Source=app.db";

            switch (provider.ToLowerInvariant())
            {
                case "sqlite":
                    options.UseSqlite(connectionString);
                    break;
                case "sqlserver":
                    options.UseSqlServer(connectionString);
                    break;
                default:
                    throw new InvalidOperationException($"Unknown Database:Provider '{provider}'. Use 'Sqlite' or 'SqlServer'.");
            }
        });

        services.AddHttpContextAccessor();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IFavoriteService, FavoriteService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        // Configured from JwtSettings at resolve time, after all configuration sources are in.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtSettings>>((options, jwtOptions) =>
            {
                JwtSettings jwt = jwtOptions.Value;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        // Scoped, because it checks permissions against the database for each request.
        services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddAuthorization();

        return services;
    }
}
