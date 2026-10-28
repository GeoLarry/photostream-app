using Microsoft.EntityFrameworkCore;
using Starter.Core.Contracts;
using Starter.Core.Exceptions;
using Starter.Core.Interfaces;
using Starter.Core.Models;
using Starter.Infrastructure.Data;

namespace Starter.Infrastructure.Services;

public class FavoriteService(AppDbContext db) : IFavoriteService
{
    public async Task<IReadOnlyList<FavoriteResponse>> GetFavoritesAsync(int userId, CancellationToken ct = default)
    {
        List<Favorite> favorites = await db.Favorites
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAtUtc)
            .ThenByDescending(f => f.Id)
            .ToListAsync(ct);

        return favorites.Select(ToResponse).ToList();
    }

    public async Task<FavoriteResponse> AddFavoriteAsync(int userId, string photoId, AddFavoriteRequest request, CancellationToken ct = default)
    {
        Validate(photoId, request);

        Favorite? existing = await db.Favorites
            .AsNoTracking()
            .SingleOrDefaultAsync(f => f.UserId == userId && f.PhotoId == photoId, ct);
        if (existing is not null) return ToResponse(existing);

        Favorite favorite = new()
        {
            UserId = userId,
            PhotoId = photoId,
            Author = request.Author.Trim(),
            Width = request.Width,
            Height = request.Height,
            Url = request.Url,
            DownloadUrl = request.DownloadUrl
        };

        db.Favorites.Add(favorite);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // A parallel request (e.g. a double click) saved the same photo first: the unique index
            // rejected this one, so return the row that won.
            db.Entry(favorite).State = EntityState.Detached;
            Favorite? winner = await db.Favorites
                .AsNoTracking()
                .SingleOrDefaultAsync(f => f.UserId == userId && f.PhotoId == photoId, ct);
            if (winner is null) throw;
            return ToResponse(winner);
        }

        return ToResponse(favorite);
    }

    public async Task<bool> RemoveFavoriteAsync(int userId, string photoId, CancellationToken ct = default)
    {
        int deleted = await db.Favorites
            .Where(f => f.UserId == userId && f.PhotoId == photoId)
            .ExecuteDeleteAsync(ct);

        return deleted > 0;
    }

    private static void Validate(string photoId, AddFavoriteRequest request)
    {
        if (string.IsNullOrWhiteSpace(photoId) || photoId.Length > FavoriteLimits.PhotoIdLength)
            throw new ValidationFailedException($"Photo id must be 1-{FavoriteLimits.PhotoIdLength} characters.");

        if (string.IsNullOrWhiteSpace(request.Author) || request.Author.Length > FavoriteLimits.AuthorLength)
            throw new ValidationFailedException($"Author must be 1-{FavoriteLimits.AuthorLength} characters.");

        if (request.Width <= 0 || request.Height <= 0)
            throw new ValidationFailedException("Width and height must be positive.");

        HttpsUrl(request.Url, "Url");
        HttpsUrl(request.DownloadUrl, "Download url");
    }

    private static void HttpsUrl(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > FavoriteLimits.UrlLength
            || !Uri.TryCreate(value, UriKind.Absolute, out Uri? uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new ValidationFailedException($"{fieldName} must be an absolute https URL of at most {FavoriteLimits.UrlLength} characters.");
    }

    private static FavoriteResponse ToResponse(Favorite f) =>
        new(f.PhotoId, f.Author, f.Width, f.Height, f.Url, f.DownloadUrl, f.CreatedAtUtc);
}
