namespace Starter.Core.Contracts;

// The photo details to keep with a favorite. The photo id comes from the route.
public record AddFavoriteRequest(
    string Author,
    int Width,
    int Height,
    string Url,
    string DownloadUrl);

public record FavoriteResponse(
    string PhotoId,
    string Author,
    int Width,
    int Height,
    string Url,
    string DownloadUrl,
    DateTime CreatedAtUtc);
