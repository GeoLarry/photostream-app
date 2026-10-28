using System.Net;
using System.Net.Http.Json;
using Starter.Core.Contracts;
using Starter.Core.Enums;

namespace Starter.Api.Tests;

public class FavoriteTests(StarterApiFactory factory) : IClassFixture<StarterApiFactory>
{
    private static AddFavoriteRequest Photo(string photoId) => new(
        "Alejandro Escamilla",
        5000,
        3333,
        $"https://unsplash.com/photos/{photoId}",
        $"https://picsum.photos/id/{photoId}/5000/3333");

    private static Task<HttpResponseMessage> AddAsync(HttpClient client, string photoId, AddFavoriteRequest? request = null) =>
        client.PutAsJsonAsync($"/api/favorites/{photoId}", request ?? Photo(photoId), StarterApiFactory.Json);

    private static async Task<List<FavoriteResponse>> ListAsync(HttpClient client, string url = "/api/favorites") =>
        (await client.GetFromJsonAsync<List<FavoriteResponse>>(url, StarterApiFactory.Json))!;

    [Fact]
    public async Task A_new_user_can_add_list_and_remove_favorites()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();

        (await AddAsync(client, "10")).EnsureSuccessStatusCode();
        (await AddAsync(client, "20")).EnsureSuccessStatusCode();

        List<FavoriteResponse> favorites = await ListAsync(client);
        Assert.Equal(["20", "10"], favorites.Select(f => f.PhotoId));
        Assert.Equal("https://picsum.photos/id/10/5000/3333", favorites[1].DownloadUrl);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/favorites/10")).StatusCode);

        Assert.Equal(["20"], (await ListAsync(client)).Select(f => f.PhotoId));
    }

    [Fact]
    public async Task Adding_the_same_photo_twice_keeps_one_favorite()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();

        (await AddAsync(client, "30")).EnsureSuccessStatusCode();
        HttpResponseMessage second = await AddAsync(client, "30");

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Single(await ListAsync(client));
    }

    [Fact]
    public async Task Users_only_see_their_own_favorites()
    {
        (_, HttpClient alice) = await factory.RegisterUserAsync();
        (_, HttpClient bob) = await factory.RegisterUserAsync();

        (await AddAsync(alice, "40")).EnsureSuccessStatusCode();

        Assert.Empty(await ListAsync(bob));
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync("/api/favorites/40")).StatusCode);
        Assert.Single(await ListAsync(alice));
    }

    [Fact]
    public async Task Removing_a_photo_that_is_not_a_favorite_returns_404()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();

        HttpResponseMessage response = await client.DeleteAsync("/api/favorites/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_photo_details_are_rejected()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();

        HttpResponseMessage response = await AddAsync(client, "50", Photo("50") with { Url = "javascript:alert(1)" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task Favorites_require_a_token()
    {
        HttpClient anonymous = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/favorites")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await AddAsync(anonymous, "60")).StatusCode);
    }

    [Fact]
    public async Task A_user_whose_roles_lack_favorites_gets_403()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        (AuthResponse user, HttpClient userClient) = await factory.RegisterUserAsync();

        // Replace the user's default role with one that only grants Users.View.
        CreateRoleRequest roleRequest = new($"No favorites {Guid.NewGuid():N}", null, [new RolePermissionDto(PermissionModule.Users, PermissionAction.View)]);
        HttpResponseMessage roleResponse = await admin.PostAsJsonAsync("/api/roles", roleRequest, StarterApiFactory.Json);
        RoleResponse role = (await roleResponse.Content.ReadFromJsonAsync<RoleResponse>(StarterApiFactory.Json))!;

        UpdateUserRequest update = new(user.User.Email, [role.Id], "Test", "User", null);
        (await admin.PutAsJsonAsync($"/api/users/{user.User.Id}", update, StarterApiFactory.Json)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await userClient.GetAsync("/api/favorites")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await AddAsync(userClient, "70")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await userClient.DeleteAsync("/api/favorites/70")).StatusCode);
    }

    [Fact]
    public async Task The_admin_sees_a_users_favorites()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        (AuthResponse user, HttpClient userClient) = await factory.RegisterUserAsync();
        (await AddAsync(userClient, "80")).EnsureSuccessStatusCode();

        List<FavoriteResponse> favorites = await ListAsync(admin, $"/api/users/{user.User.Id}/favorites");

        Assert.Equal(["80"], favorites.Select(f => f.PhotoId));
    }

    [Fact]
    public async Task A_regular_user_gets_403_on_another_users_favorites()
    {
        (AuthResponse other, _) = await factory.RegisterUserAsync();
        (_, HttpClient userClient) = await factory.RegisterUserAsync();

        HttpResponseMessage response = await userClient.GetAsync($"/api/users/{other.User.Id}/favorites");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task The_admin_gets_404_for_the_favorites_of_a_missing_user()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();

        HttpResponseMessage response = await admin.GetAsync("/api/users/999999/favorites");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
