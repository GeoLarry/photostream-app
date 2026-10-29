import type { Mock } from 'vitest';

// A stand-in that mocks only the listed methods of T, each typed like the real one,
// e.g. MockOf<AuthService, 'login'> = { login: Mock<AuthService['login']> }.
export type MockOf<T, K extends keyof T> = {
  [P in K]: T[P] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : never;
};
