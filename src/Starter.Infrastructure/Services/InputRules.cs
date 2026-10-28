using System.Net.Mail;
using System.Text.RegularExpressions;
using Starter.Core.Exceptions;

namespace Starter.Infrastructure.Services;

// Shared input checks for users. Each throws ValidationFailedException with a readable message.
internal static partial class InputRules
{
    [GeneratedRegex("^[a-zA-Z0-9._-]{3,50}$")]
    private static partial Regex UsernamePattern();

    public static void Username(string? username)
    {
        if (string.IsNullOrWhiteSpace(username) || !UsernamePattern().IsMatch(username))
            throw new ValidationFailedException("Username must be 3-50 characters: letters, digits, dot, dash or underscore.");
    }

    public static void Email(string? email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 256 || !MailAddress.TryCreate(email, out MailAddress? parsed) || parsed.Address != email)
            throw new ValidationFailedException("Email address is not valid.");
    }

    public static void Password(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8 || password.Length > 128
            || !password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            throw new ValidationFailedException("Password must be 8-128 characters and contain at least one letter and one digit.");
    }

    public static void OptionalName(string? value, string fieldName)
    {
        if (value is not null && value.Length > 100)
            throw new ValidationFailedException($"{fieldName} must be at most 100 characters.");
    }

    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
