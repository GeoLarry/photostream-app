using System.Text.Json.Serialization;
using Scalar.AspNetCore;
using Starter.Api.Endpoints;
using Starter.Api.Extensions;
using Starter.Infrastructure;
using Starter.Infrastructure.Data;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. SERVICES
// ==========================================

// Database, JWT authentication, permission-based authorization and the auth/user/role services.
builder.Services.AddInfrastructure();

// camelCase JSON with enums as strings, e.g. { "module": "Users", "action": "Edit" }.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Service errors become 400 { message }, everything else a standard 500 problem response.
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddProblemDetails();

// CORS for the Angular client. Origins come from configuration (Cors:AllowedOrigins).
string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Limits on the public auth endpoints (RateLimiting:Auth).
builder.Services.AddAuthRateLimiting();

builder.Services.AddOpenApi();

WebApplication app = builder.Build();

// ==========================================
// 2. DATABASE
// ==========================================

// Creates or migrates the database and seeds roles, the first admin and (in Development) demo users.
if (app.Configuration.GetValue("Database:InitializeOnStartup", true))
{
    await DbInitializer.InitializeAsync(app.Services);
}

// ==========================================
// 3. MIDDLEWARE
// ==========================================

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// ==========================================
// 4. ENDPOINTS
// ==========================================

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapRoleEndpoints();
app.MapFavoriteEndpoints();

app.Run();

// Lets the integration tests start the app with WebApplicationFactory<Program>.
public partial class Program;
