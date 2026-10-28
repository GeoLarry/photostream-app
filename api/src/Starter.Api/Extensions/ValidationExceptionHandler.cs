using Microsoft.AspNetCore.Diagnostics;
using Starter.Core.Exceptions;

namespace Starter.Api.Extensions;

// Turns ValidationFailedException from any service into 400 { "message": "..." },
// so endpoints stay free of try/catch blocks.
public class ValidationExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ValidationFailedException validation) return false;

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        await httpContext.Response.WriteAsJsonAsync(new { message = validation.Message }, cancellationToken);
        return true;
    }
}
