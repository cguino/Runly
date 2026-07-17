export {
  createMockAuthService,
  getAuthService,
  isOldEnoughForAccount,
  MIN_ACCOUNT_AGE_YEARS,
} from './auth-service';
export type {
  AuthProvider,
  AuthService,
  AuthUser,
  SignUpParams,
  SignUpRefusal,
  SignUpResult,
} from './auth-service';
