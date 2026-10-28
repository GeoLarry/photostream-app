import { RoleSummary } from './auth.model';

// Mirrors UserResponse in api/src/Starter.Core/Contracts/UserContracts.cs
export interface UserSummary {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  emailConfirmed: boolean;
  // ISO 8601 in UTC ("...Z"); shown in the viewer's local time with DatePipe
  createdAtUtc: string;
  roles: RoleSummary[];
}

// Mirrors api/src/Starter.Core/Contracts/PagedResponse.cs
export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
