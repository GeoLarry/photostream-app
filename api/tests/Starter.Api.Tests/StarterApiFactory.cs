using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Starter.Core.Contracts;
using Starter.Core.Interfaces;

namespace Starter.Api.Tests;

// Runs the real API in memory against a private in-memory SQLite database per test class.
public class StarterApiFactory : WebApplicationFactory<Program>
{
    public const string AdminUsername = "admin";
    public const string AdminPassword = "TestAdmin123!";

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    // Emails the app sent, so tests can follow confirmation links.
    public FakeEmailSender Emails { get; } = new();

    // Starts at the real time (JWTs are still checked against it) and can be moved forward to expire links.
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.UtcNow);

    private readonly string _connectionString = $"Data Source=file:starter-tests-{Guid.NewGuid():N}?mode=memory&cache=shared";

    // A shared-cache in-memory SQLite database lives only while a connection to it is open,
    // so this one stays open for the lifetime of the factory.
    private readonly SqliteConnection _keepAlive;

    public StarterApiFactory()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Added last, so these values win over appsettings.json. The app reads its
        // configuration after the host is built, so all of these take effect.
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = _connectionString,
                ["Database:Provider"] = "Sqlite",
                ["Jwt:Secret"] = "test-only-secret-key-that-is-long-enough-0123456789",
                ["Seed:AdminUsername"] = AdminUsername,
                ["Seed:AdminPassword"] = AdminPassword,
                ["Seed:DemoUsers"] = "0",
                ["Email:Host"] = "",
                ["RateLimiting:Auth:PermitLimit"] = "100000"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _keepAlive.Dispose();
    }

    public async Task<AuthResponse> LoginAsync(string username, string password)
    {
        HttpClient client = CreateClient();
        HttpResponseMessage response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
    }

    public async Task<HttpClient> CreateAdminClientAsync()
    {
        AuthResponse auth = await LoginAsync(AdminUsername, AdminPassword);
        return CreateClientWithToken(auth.Token);
    }

    // Signs up a fresh user with a unique name, without confirming the email.
    public async Task<RegisterRequest> RegisterUnconfirmedUserAsync()
    {
        string username = $"user{Guid.NewGuid():N}"[..20];
        RegisterRequest request = new(username, $"{username}@example.com", "Password1", "Test", "User");

        HttpResponseMessage response = await CreateClient().PostAsJsonAsync("/api/auth/register", request);
        response.EnsureSuccessStatusCode();
        return request;
    }

    // Signs up a fresh user and confirms the email through the emailed link,
    // then returns their login and a client signed in as them.
    public async Task<(AuthResponse Auth, HttpClient Client)> RegisterUserAsync()
    {
        RegisterRequest request = await RegisterUnconfirmedUserAsync();

        HttpResponseMessage response = await CreateClient()
            .PostAsJsonAsync("/api/auth/confirm-email", new ConfirmEmailRequest(Emails.LatestTokenFor(request.Email)));
        response.EnsureSuccessStatusCode();

        AuthResponse auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(Json))!;
        return (auth, CreateClientWithToken(auth.Token));
    }

    public HttpClient CreateClientWithToken(string token)
    {
        HttpClient client = CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
