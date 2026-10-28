// Mirrors api/src/Starter.Core/Contracts/AuthContracts.cs

export interface RoleSummary {
  id: number;
  name: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: RoleSummary[];
  // Flat "Module.Action" strings, e.g. "Users.View"
  permissions: string[];
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: CurrentUser;
}

export interface LoginRequest {
  // Username or email
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
}

// Body of the API's 4xx answers, e.g. { message: "...", code: "EmailNotConfirmed" }
export interface ApiMessage {
  message: string;
  code?: string;
}
