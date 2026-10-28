using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;

namespace Starter.Api.Tests;

// Keeps sent emails in memory so tests can read the confirmation link instead of a real inbox.
public partial class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _sent.Enqueue(message);
        return Task.CompletedTask;
    }

    public IReadOnlyList<EmailMessage> SentTo(string email) =>
        _sent.Where(m => string.Equals(m.To, email, StringComparison.OrdinalIgnoreCase)).ToList();

    // The token from the newest confirmation link sent to this address.
    public string LatestTokenFor(string email)
    {
        EmailMessage message = SentTo(email).LastOrDefault()
            ?? throw new InvalidOperationException($"No email was sent to {email}.");
        return ExtractToken(message);
    }

    public static string ExtractToken(EmailMessage message) =>
        TokenPattern().Match(message.TextBody) is { Success: true } match
            ? match.Groups[1].Value
            : throw new InvalidOperationException("The email has no confirmation link.");

    [GeneratedRegex(@"confirm-email\?token=([A-Za-z0-9_-]+)")]
    private static partial Regex TokenPattern();
}
