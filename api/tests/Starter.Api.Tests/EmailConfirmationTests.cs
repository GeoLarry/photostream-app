using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Starter.Core.Contracts;

namespace Starter.Api.Tests;

public class EmailConfirmationTests(StarterApiFactory factory) : IClassFixture<StarterApiFactory>
{
    private Task<HttpResponseMessage> LoginAsync(string username, string password) =>
        factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));

    private Task<HttpResponseMessage> ConfirmAsync(string token) =>
        factory.CreateClient().PostAsJsonAsync("/api/auth/confirm-email", new ConfirmEmailRequest(token));

    private Task<HttpResponseMessage> ResendAsync(string email) =>
        factory.CreateClient().PostAsJsonAsync("/api/auth/resend-confirmation", new ResendConfirmationRequest(email));

    // Moves the clock past the resend cooldown, so a new link may be sent.
    private void WaitOutCooldown() => factory.Clock.Advance(TimeSpan.FromSeconds(61));

    [Fact]
    public async Task Register_returns_202_without_a_token_and_emails_a_confirmation_link()
    {
        RegisterRequest request = new($"reg{Guid.NewGuid():N}"[..20], $"{Guid.NewGuid():N}@example.com", "Password1", "Jane", null);

        HttpResponseMessage response = await factory.CreateClient().PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.DoesNotContain("token", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        EmailMessage email = Assert.Single(factory.Emails.SentTo(request.Email));
        Assert.Contains("Hi Jane", email.TextBody);
        Assert.Contains("http://localhost:4200/confirm-email?token=", email.TextBody);
        Assert.Contains("http://localhost:4200/confirm-email?token=", email.HtmlBody);
    }

    [Fact]
    public async Task Login_before_confirming_returns_403_with_a_code()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();

        HttpResponseMessage response = await LoginAsync(user.Username, user.Password);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("EmailNotConfirmed", body.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Login_with_a_wrong_password_on_an_unconfirmed_account_is_a_plain_401()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();

        HttpResponseMessage response = await LoginAsync(user.Username, "WrongPassword1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Confirming_signs_the_user_in_and_allows_login()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();

        HttpResponseMessage response = await ConfirmAsync(factory.Emails.LatestTokenFor(user.Email));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AuthResponse auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(StarterApiFactory.Json))!;
        HttpResponseMessage me = await factory.CreateClientWithToken(auth.Token).GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(user.Username, user.Password)).StatusCode);
    }

    [Fact]
    public async Task A_link_works_only_once()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();
        string token = factory.Emails.LatestTokenFor(user.Email);

        (await ConfirmAsync(token)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(token)).StatusCode);
    }

    [Fact]
    public async Task An_unknown_token_returns_400()
    {
        HttpResponseMessage response = await ConfirmAsync("not-a-real-token");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task An_expired_link_returns_400_and_the_account_stays_unconfirmed()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();
        string token = factory.Emails.LatestTokenFor(user.Email);

        factory.Clock.Advance(TimeSpan.FromHours(25));

        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(token)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await LoginAsync(user.Username, user.Password)).StatusCode);
    }

    [Fact]
    public async Task Resend_sends_a_new_link_and_the_old_one_stops_working()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();
        string oldToken = factory.Emails.LatestTokenFor(user.Email);
        WaitOutCooldown();

        HttpResponseMessage response = await ResendAsync(user.Email);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(2, factory.Emails.SentTo(user.Email).Count);
        string newToken = factory.Emails.LatestTokenFor(user.Email);
        Assert.NotEqual(oldToken, newToken);

        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(oldToken)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ConfirmAsync(newToken)).StatusCode);
    }

    [Fact]
    public async Task Resend_within_the_cooldown_sends_nothing_new()
    {
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();

        HttpResponseMessage response = await ResendAsync(user.Email);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Single(factory.Emails.SentTo(user.Email));
    }

    [Fact]
    public async Task Resend_gives_the_same_answer_for_unknown_and_confirmed_addresses_and_sends_nothing()
    {
        (AuthResponse confirmed, _) = await factory.RegisterUserAsync();
        string unknown = $"{Guid.NewGuid():N}@example.com";
        WaitOutCooldown();

        HttpResponseMessage unknownResponse = await ResendAsync(unknown);
        HttpResponseMessage confirmedResponse = await ResendAsync(confirmed.User.Email);

        Assert.Equal(HttpStatusCode.Accepted, unknownResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, confirmedResponse.StatusCode);
        Assert.Equal(await unknownResponse.Content.ReadAsStringAsync(), await confirmedResponse.Content.ReadAsStringAsync());
        Assert.Empty(factory.Emails.SentTo(unknown));
        Assert.Single(factory.Emails.SentTo(confirmed.User.Email));
    }

    [Fact]
    public async Task A_user_created_by_the_admin_can_log_in_without_confirming()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        List<RoleResponse> roles = (await admin.GetFromJsonAsync<List<RoleResponse>>("/api/roles", StarterApiFactory.Json))!;
        string username = $"adm{Guid.NewGuid():N}"[..20];
        CreateUserRequest request = new(username, $"{username}@example.com", "Password1", [roles.Single(r => r.Name == "User").Id], null, null);

        HttpResponseMessage created = await admin.PostAsJsonAsync("/api/users", request, StarterApiFactory.Json);
        UserResponse user = (await created.Content.ReadFromJsonAsync<UserResponse>(StarterApiFactory.Json))!;

        Assert.True(user.EmailConfirmed);
        Assert.Empty(factory.Emails.SentTo(request.Email));
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(username, "Password1")).StatusCode);
    }

    [Fact]
    public async Task The_admin_can_confirm_an_email_by_hand()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        RegisterRequest user = await factory.RegisterUnconfirmedUserAsync();
        PagedResponse<UserResponse> page = (await admin.GetFromJsonAsync<PagedResponse<UserResponse>>($"/api/users?search={user.Username}", StarterApiFactory.Json))!;
        UserResponse listed = Assert.Single(page.Items);
        Assert.False(listed.EmailConfirmed);

        HttpResponseMessage response = await admin.PostAsync($"/api/users/{listed.Id}/confirm-email", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginAsync(user.Username, user.Password)).StatusCode);
        // The emailed link is no longer needed and stops working.
        Assert.Equal(HttpStatusCode.BadRequest, (await ConfirmAsync(factory.Emails.LatestTokenFor(user.Email))).StatusCode);
    }

    [Fact]
    public async Task A_regular_user_gets_403_when_confirming_someone_elses_email()
    {
        (AuthResponse other, _) = await factory.RegisterUserAsync();
        (_, HttpClient userClient) = await factory.RegisterUserAsync();

        HttpResponseMessage response = await userClient.PostAsync($"/api/users/{other.User.Id}/confirm-email", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}

// A host with a tiny auth rate limit, to see the limiter answer.
public class LowRateLimitFactory : StarterApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["RateLimiting:Auth:PermitLimit"] = "2" }));
    }
}

public class AuthRateLimitTests(LowRateLimitFactory factory) : IClassFixture<LowRateLimitFactory>
{
    [Fact]
    public async Task Too_many_auth_requests_from_one_client_get_429()
    {
        HttpClient client = factory.CreateClient();
        LoginRequest wrong = new("nobody", "WrongPassword1");

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", wrong)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", wrong)).StatusCode);

        HttpResponseMessage third = await client.PostAsJsonAsync("/api/auth/login", wrong);

        Assert.Equal(HttpStatusCode.TooManyRequests, third.StatusCode);
    }
}
