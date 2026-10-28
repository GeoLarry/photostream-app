namespace Starter.Infrastructure.Email;

// SMTP settings. Locally this points at Mailpit (see compose.yaml); in production at any SMTP provider.
// With an empty Host, emails are written to the log instead of being sent.
public class EmailOptions
{
    public const string SectionName = "Email";

    public string? Host { get; set; }
    public int Port { get; set; } = 587;

    // true = TLS from the start (port 465), false = STARTTLS when the server offers it (port 587, Mailpit).
    public bool UseSsl { get; set; }

    public string? Username { get; set; }
    public string? Password { get; set; }

    public string FromAddress { get; set; } = "no-reply@photostream.local";
    public string FromName { get; set; } = "Photostream";
}

// Where the Angular app runs, for links in emails, e.g. {BaseUrl}/confirm-email?token=...
public class FrontendOptions
{
    public const string SectionName = "Frontend";

    public string BaseUrl { get; set; } = "http://localhost:4200";
}

public class EmailConfirmationOptions
{
    public const string SectionName = "EmailConfirmation";

    public int TokenLifetimeHours { get; set; } = 24;

    // A new link is not sent if the last one is younger than this, against email bombing.
    public int ResendCooldownSeconds { get; set; } = 60;
}
