namespace Starter.Core.Contracts;

public record PagedResponse<T>(IReadOnlyList<T> Items, int TotalCount, int PageNumber, int PageSize);
