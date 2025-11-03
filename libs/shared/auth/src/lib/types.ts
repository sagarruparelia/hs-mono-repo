/**
 * Authentication & Authorization Types
 */

// User information
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  roles: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

// Authentication state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  sessionExpiresAt: number | null;
}

// Authentication context
export interface AuthContextType extends AuthState {
  login: (redirectPath?: string) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}

// OIDC configuration
export interface OIDCConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
  responseType: 'code';
  codeChallengeMethod: 'S256';
  automaticSilentRenew?: boolean;
  refreshThresholdSeconds?: number;
}

// PKCE parameters
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
}

// Authorization URL parameters
export interface AuthorizationParams {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method: 'S256';
  prompt?: 'none' | 'login' | 'consent' | 'select_account';
  max_age?: number;
  ui_locales?: string;
}

// Token exchange request
export interface TokenExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
}

// Token exchange response (from BFF)
export interface TokenExchangeResponse {
  sessionId: string;
  user: User;
  expiresIn: number;
  expiresAt: number;
}

// Token refresh response
export interface TokenRefreshResponse {
  expiresIn: number;
  expiresAt: number;
}

// Session info (from BFF)
export interface SessionInfo {
  user: User;
  expiresAt: number;
  createdAt: number;
  lastActivity: number;
}

// Authentication errors
export type AuthErrorCode =
  | 'UNAUTHORIZED'
  | 'SESSION_EXPIRED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'INVALID_STATE'
  | 'NETWORK_ERROR'
  | 'IDP_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'UNKNOWN_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: any;
}

// Protected route props
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, requires ALL roles/permissions; if false, requires ANY
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// Auth event types
export type AuthEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'TOKEN_REFRESHED'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED';

export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  data?: any;
}

// Auth storage keys
export const AUTH_STORAGE_KEYS = {
  CODE_VERIFIER: 'auth_code_verifier',
  STATE: 'auth_state',
  REDIRECT_PATH: 'auth_redirect_path',
  LAST_ACTIVITY: 'auth_last_activity',
} as const;

// Role definitions (can be extended based on your needs)
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

// Permission definitions (can be extended based on your needs)
export enum Permission {
  READ_PROFILE = 'profile:read',
  WRITE_PROFILE = 'profile:write',
  READ_SUMMARY = 'summary:read',
  WRITE_SUMMARY = 'summary:write',
  MANAGE_USERS = 'users:manage',
  ADMIN_ACCESS = 'admin:access',
}
