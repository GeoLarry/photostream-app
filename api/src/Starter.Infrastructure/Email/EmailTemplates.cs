using System.Net;
using Starter.Core.Contracts;

namespace Starter.Infrastructure.Email;

internal static class EmailTemplates
{
    public static EmailMessage ConfirmEmail(string to, string name, string link, int lifetimeHours)
    {
        // Everything inserted into the HTML is encoded: the name comes from user input.
        string safeName = WebUtility.HtmlEncode(name);
        string safeLink = WebUtility.HtmlEncode(link);

        string html = $"""
            <!doctype html>
            <html>
            <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px">
                <tr><td style="padding:32px">
                  <h1 style="margin:0 0 16px;font-size:20px">Confirm your email</h1>
                  <p style="margin:0 0 24px;line-height:1.5">Hi {safeName}, thanks for signing up to Photostream. Confirm your email address to activate your account.</p>
                  <p style="margin:0 0 24px">
                    <a href="{safeLink}" style="display:inline-block;padding:12px 20px;background:#3f51b5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold">Confirm email</a>
                  </p>
                  <p style="margin:0 0 8px;font-size:13px;color:#52525b">The link expires in {lifetimeHours} hours. If the button does not work, copy this address into your browser:</p>
                  <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="{safeLink}" style="color:#3f51b5">{safeLink}</a></p>
                  <p style="margin:0;font-size:13px;color:#52525b">If you did not sign up, you can ignore this email.</p>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        string text = $"""
            Hi {name},

            Thanks for signing up to Photostream. Open this link to confirm your email address and activate your account:

            {link}

            The link expires in {lifetimeHours} hours. If you did not sign up, you can ignore this email.
            """;

        return new EmailMessage(to, "Confirm your Photostream account", html, text);
    }
}
