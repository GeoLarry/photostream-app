using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;

namespace Starter.Infrastructure.Email;

// Sends through SMTP with MailKit, which Microsoft recommends over System.Net.Mail.SmtpClient.
public class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        EmailOptions settings = options.Value;

        MimeMessage mime = new();
        mime.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.HtmlBody, TextBody = message.TextBody }.ToMessageBody();

        // Only registered when Host is set (see DependencyInjection).
        string host = settings.Host ?? throw new InvalidOperationException("Email:Host is not configured.");

        using SmtpClient client = new();
        SecureSocketOptions security = settings.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;
        await client.ConnectAsync(host, settings.Port, security, ct);

        if (!string.IsNullOrEmpty(settings.Username))
            await client.AuthenticateAsync(settings.Username, settings.Password ?? string.Empty, ct);

        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(quit: true, ct);
    }
}
