using System.Net.Http.Json;
using System.Text.Json;
using Starter.Core.Contracts;

namespace Starter.Api.Tests;

// The database keeps no time zone, so these check that dates read back from it are still sent as UTC ("Z"),
// otherwise browsers would show them shifted by the local offset.
public class DateTimeTests(StarterApiFactory factory) : IClassFixture<StarterApiFactory>
{
    private static async Task<string> ReadCreatedAtAsync(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        using JsonDocument json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        JsonElement item = json.RootElement.ValueKind == JsonValueKind.Array ? json.RootElement[0] : json.RootElement;
        return item.GetProperty("createdAtUtc").GetString()!;
    }

    [Fact]
    public async Task Favorite_dates_read_from_the_database_are_utc()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();
        AddFavoriteRequest photo = new("Author", 100, 100, "https://unsplash.com/photos/1", "https://picsum.photos/id/1/100/100");

        string created = await ReadCreatedAtAsync(await client.PutAsJsonAsync("/api/favorites/1", photo, StarterApiFactory.Json));
        string listed = await ReadCreatedAtAsync(await client.GetAsync("/api/favorites"));

        Assert.EndsWith("Z", listed);
        Assert.Equal(DateTime.Parse(created).ToUniversalTime(), DateTime.Parse(listed).ToUniversalTime());
    }

    [Fact]
    public async Task User_dates_read_from_the_database_are_utc()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        (AuthResponse user, _) = await factory.RegisterUserAsync();

        string createdAt = await ReadCreatedAtAsync(await admin.GetAsync($"/api/users/{user.User.Id}"));

        Assert.EndsWith("Z", createdAt);
    }
}
