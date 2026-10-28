using System.Net;
using System.Net.Http.Json;
using Starter.Core.Contracts;
using Starter.Core.Enums;

namespace Starter.Api.Tests;

public class AuthorizationTests(StarterApiFactory factory) : IClassFixture<StarterApiFactory>
{
    [Fact]
    public async Task A_regular_user_gets_403_on_the_users_list()
    {
        (_, HttpClient client) = await factory.RegisterUserAsync();

        HttpResponseMessage response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task The_admin_gets_the_users_list()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();

        PagedResponse<UserResponse>? page = await admin.GetFromJsonAsync<PagedResponse<UserResponse>>("/api/users", StarterApiFactory.Json);

        Assert.NotNull(page);
        Assert.Contains(page.Items, u => u.Username == StarterApiFactory.AdminUsername);
    }

    [Fact]
    public async Task A_new_permission_applies_to_an_existing_token_immediately()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        (AuthResponse user, HttpClient userClient) = await factory.RegisterUserAsync();

        // Before: the user's token cannot list users.
        Assert.Equal(HttpStatusCode.Forbidden, (await userClient.GetAsync("/api/users")).StatusCode);

        // The admin creates a role with Users.View and adds it to the user.
        CreateRoleRequest roleRequest = new($"Viewers {Guid.NewGuid():N}", null, [new RolePermissionDto(PermissionModule.Users, PermissionAction.View)]);
        HttpResponseMessage roleResponse = await admin.PostAsJsonAsync("/api/roles", roleRequest, StarterApiFactory.Json);
        RoleResponse role = (await roleResponse.Content.ReadFromJsonAsync<RoleResponse>(StarterApiFactory.Json))!;

        List<int> roleIds = user.User.Roles.Select(r => r.Id).Append(role.Id).ToList();
        UpdateUserRequest update = new(user.User.Email, roleIds, "Test", "User", null);
        (await admin.PutAsJsonAsync($"/api/users/{user.User.Id}", update, StarterApiFactory.Json)).EnsureSuccessStatusCode();

        // After: the same token works without logging in again.
        Assert.Equal(HttpStatusCode.OK, (await userClient.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task A_deactivated_user_is_locked_out_even_with_a_valid_token()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        (AuthResponse user, HttpClient userClient) = await factory.RegisterUserAsync();

        (await admin.DeleteAsync($"/api/users/{user.User.Id}")).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await userClient.GetAsync("/api/auth/me")).StatusCode);

        HttpResponseMessage login = await factory.CreateClient()
            .PostAsJsonAsync("/api/auth/login", new LoginRequest(user.User.Username, "Password1"));
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task System_permissions_cannot_be_granted_through_the_api()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        CreateRoleRequest request = new($"Sneaky {Guid.NewGuid():N}", null, [new RolePermissionDto(PermissionModule.System, PermissionAction.Edit)]);

        HttpResponseMessage response = await admin.PostAsJsonAsync("/api/roles", request, StarterApiFactory.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Built_in_roles_cannot_be_deleted()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        List<RoleResponse>? roles = await admin.GetFromJsonAsync<List<RoleResponse>>("/api/roles", StarterApiFactory.Json);
        RoleResponse administrator = roles!.Single(r => r.Name == "Administrator");

        HttpResponseMessage response = await admin.DeleteAsync($"/api/roles/{administrator.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Nobody_can_deactivate_their_own_account()
    {
        HttpClient admin = await factory.CreateAdminClientAsync();
        AuthResponse adminAuth = await factory.LoginAsync(StarterApiFactory.AdminUsername, StarterApiFactory.AdminPassword);

        HttpResponseMessage response = await admin.DeleteAsync($"/api/users/{adminAuth.User.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
