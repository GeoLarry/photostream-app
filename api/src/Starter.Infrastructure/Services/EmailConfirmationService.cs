using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Starter.Core.Interfaces;
using Starter.Core.Models;
using Starter.Infrastructure.Data;
using Starter.Infrastructure.Email;

namespace Starter.Infrastructure.Services;

public class EmailConfirmationService(
    AppDbContext db,
    IEmailSender emailSender,
    TimeProvider timeProvider,
    IOptions<EmailConfirmationOptions> confirmationOptions,
    IOptions<FrontendOptions> frontendOptions,
    ILogger<EmailConfirmationService> logger) : IEmailConfirmationService
{
    public async Task SendConfirmationAsync(User user, CancellationToken ct = default)
    {
        EmailConfirmationOptions options = confirmationOptions.Value;
        DateTime now = timeProvider.GetUtcNow().UtcDateTime;

        DateTime cooldownStart = now.AddSeconds(-options.ResendCooldownSeconds);
        if (await db.EmailConfirmationTokens.AnyAsync(t => t.UserId == user.Id && t.CreatedAtUtc > cooldownStart, ct))
            return;

        // Only the newest link works.
        await db.EmailConfirmationTokens.Where(t => t.UserId == user.Id).ExecuteDeleteAsync(ct);

        // 256 random bits, URL-safe, so it can go straight into the link.
        string token = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));

        db.EmailConfirmationTokens.Add(new EmailConfirmationToken
        {
            UserId = user.Id,
            TokenHash = Hash(token),
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(options.TokenLifetimeHours)
        });
        await db.SaveChangesAsync(ct);

        string link = $"{frontendOptions.Value.BaseUrl.TrimEnd('/')}/confirm-email?token={token}";
        string name = user.FirstName ?? user.Username;

        try
        {
            await emailSender.SendAsync(EmailTemplates.ConfirmEmail(user.Email, name, link, options.TokenLifetimeHours), ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Could not send the confirmation email to user {UserId}.", user.Id);
        }
    }

    public async Task<int?> ConfirmAsync(string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        DateTime now = timeProvider.GetUtcNow().UtcDateTime;
        string hash = Hash(token);

        EmailConfirmationToken? stored = await db.EmailConfirmationTokens
            .Include(t => t.User)
            .SingleOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null || stored.ExpiresAtUtc <= now || !stored.User.IsActive)
            return null;

        stored.User.EmailConfirmedAtUtc ??= now;
        await db.SaveChangesAsync(ct);

        // Single use: this link and any older one stop working.
        await db.EmailConfirmationTokens.Where(t => t.UserId == stored.UserId).ExecuteDeleteAsync(ct);

        return stored.UserId;
    }

    private static string Hash(string token) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
