namespace Starter.Core.Models;

// A photo a user saved. The Picsum details are copied in when it is added,
// so listing favorites never depends on Picsum being reachable.
public class Favorite
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Picsum photo id, e.g. "237".
    public required string PhotoId { get; set; }

    public required string Author { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public required string Url { get; set; }
    public required string DownloadUrl { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

// Column sizes, shared by the database model and input validation.
public static class FavoriteLimits
{
    public const int PhotoIdLength = 50;
    public const int AuthorLength = 200;
    public const int UrlLength = 500;
}
