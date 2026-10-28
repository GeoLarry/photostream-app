using Microsoft.AspNetCore.Authorization;
using Starter.Core.Enums;

namespace Starter.Core.Authorization;

public class PermissionRequirement(PermissionModule module, PermissionAction action) : IAuthorizationRequirement
{
    public PermissionModule Module { get; } = module;
    public PermissionAction Action { get; } = action;
}
