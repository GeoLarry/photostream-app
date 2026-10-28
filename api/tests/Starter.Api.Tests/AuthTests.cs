using System.Net;
using System.Net.Http.Json;
using Starter.Core.Contracts;

namespace Starter.Api.Tests;

public class AuthTests(StarterApiFactory factory) : IClassFixture<StarterApiFactory>
{
    [Fact]
    public async Task Seeded_admin_can_log_in_and_has_user_and_role_permissions()
    {
        AuthResponse auth = await factory.LoginAsync(StarterApiFactory.AdminUsername, StarterApiFactory.AdminPassword);

        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.Contains("Users.View", auth.User.Permissions);
        Assert.Contains("Roles.Edit", auth.User.Permissions);
        Assert.Contains("System.Edit", auth.User.Permissions);
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        HttpResponseMessage response = await factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new LoginRequest(StarterApiFactory.AdminUsername, "wrong-password1"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_gives_the_default_role_and_no_admin_permissions()
    {
        (AuthResponse auth, _) = await factory.RegisterUserAsync();

        Assert.Single(auth.User.Roles);
        Assert.Equal("User", auth.User.Roles[0].Name);
        Assert.DoesNotContain("Users.View", auth.User.Permissions);
    }

    [Fact]
    public async Task Register_with_a_taken_username_returns_400_with_message()
    {
        (AuthResponse existing, _) = await factory.RegisterUserAsync();
        RegisterRequest duplicate = new(existing.User.Username, "someone.else@example.com", "Password1", null, null);

        HttpResponseMessage response = await factory.CreateClient().PostAsJsonAsync("/api/auth/register", duplicate);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains("already taken", body);
    }

    [Fact]
    public async Task Register_with_a_weak_password_returns_400()
    {
        RegisterRequest request = new("weakpassworduser", "weak@example.com", "short", null, null);

        HttpResponseMessage response = await factory.CreateClient().PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Me_returns_the_signed_in_user()
    {
        (AuthResponse auth, HttpClient client) = await factory.RegisterUserAsync();

        CurrentUserDto? me = await client.GetFromJsonAsync<CurrentUserDto>("/api/auth/me", StarterApiFactory.Json);

        Assert.NotNull(me);
        Assert.Equal(auth.User.Id, me.Id);
    }

    [Fact]
    public async Task Me_without_a_token_returns_401()
    {
        HttpResponseMessage response = await factory.CreateClient().GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
