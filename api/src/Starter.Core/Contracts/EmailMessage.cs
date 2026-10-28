namespace Starter.Core.Contracts;

// An email with an HTML body and a plain-text alternative for clients that do not render HTML.
public record EmailMessage(string To, string Subject, string HtmlBody, string TextBody);
