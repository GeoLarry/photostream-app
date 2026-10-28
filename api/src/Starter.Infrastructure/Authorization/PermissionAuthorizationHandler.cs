using Microsoft.AspNetCore.Authorization;
using Starter.Core.Authorization;
using Starter.Core.Interfaces;

namespace Starter.Infrastructure.Authorization;

// Scoped: uses the per-request ICurrentUserService, which reads permissions from the database.
// A deactivated user, or one whose role lost a permission, is refused immediately,
// even while their token has not expired yet.
public class PermissionAuthorizationHandler(ICurrentUserService currentUser) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (await currentUser.HasPermissionAsync(requirement.Module, requirement.Action))
            context.Succeed(requirement);
    }
}
