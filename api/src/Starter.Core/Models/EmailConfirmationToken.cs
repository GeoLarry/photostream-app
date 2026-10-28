namespace Starter.Core.Models;

// A pending email confirmation. Only the SHA-256 hash of the token is stored:
// the token itself exists only in the link that was emailed to the user.
public class EmailConfirmationToken
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string TokenHash { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}
