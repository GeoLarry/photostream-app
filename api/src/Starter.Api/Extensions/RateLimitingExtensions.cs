using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Starter.Api.Extensions;

public class AuthRateLimitOptions
{
    public const string SectionName = "RateLimiting:Auth";

    public int PermitLimit { get; set; } = 10;
    public int WindowMinutes { get; set; } = 15;
}

public static class RateLimitingExtensions
{
    // Policy for the public auth endpoints (login, register, email links): a fixed window per client IP,
    // against password guessing and against using sign-up to send floods of email.
    public const string AuthPolicy = "auth";

    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddOptions<AuthRateLimitOptions>().BindConfiguration(AuthRateLimitOptions.SectionName);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
                await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many attempts. Please try again later." }, ct);

            // Settings are read per request rather than at startup, so test hosts can override them.
            options.AddPolicy(AuthPolicy, httpContext =>
            {
                AuthRateLimitOptions limits = httpContext.RequestServices.GetRequiredService<IOptions<AuthRateLimitOptions>>().Value;
                string clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = limits.PermitLimit,
                    Window = TimeSpan.FromMinutes(limits.WindowMinutes),
                    QueueLimit = 0
                });
            });
        });

        return services;
    }
}
