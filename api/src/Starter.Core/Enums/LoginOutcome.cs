namespace Starter.Core.Enums;

// Outcome of a login attempt; the endpoint maps it to the right HTTP status.
public enum LoginOutcome
{
    Success,

    // Wrong username or password, or a deactivated account: deliberately indistinguishable.
    InvalidCredentials,

    // The password is correct but the email address has not been confirmed yet.
    EmailNotConfirmed
}
