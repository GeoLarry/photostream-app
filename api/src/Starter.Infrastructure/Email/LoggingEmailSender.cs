using Microsoft.Extensions.Logging;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;

namespace Starter.Infrastructure.Email;

// Used when no SMTP host is configured: the app still works and the email (with its link) is in the log.
public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        logger.LogWarning("Email:Host is not set, so this email was not sent. To: {To}, Subject: {Subject}\n{Body}",
            message.To, message.Subject, message.TextBody);
        return Task.CompletedTask;
    }
}
