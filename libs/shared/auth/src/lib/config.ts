import type { OIDCConfig } from './types';

/**
 * Authentication Configuration
 *
 * Configuration for OIDC authentication with external IDP.
 * Values are loaded from environment variables.
 */

// Get environment variables with fallbacks for development
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || defaultValue || '';
};

// OIDC Configuration
export const oidcConfig: OIDCConfig = {
  // IDP authority URL (e.g., https://auth.example.com)
  authority: getEnvVar('VITE_OIDC_AUTHORITY', 'https://idp.example.com'),

  // OAuth2 Client ID
  clientId: getEnvVar('VITE_OIDC_CLIENT_ID', 'hs-mono-repo-client'),

  // Redirect URI after login (must be registered with IDP)
  redirectUri: getEnvVar(
    'VITE_OIDC_REDIRECT_URI',
    `${window.location.origin}/auth/callback`
  ),

  // Redirect URI after logout
  postLogoutRedirectUri: getEnvVar(
    'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
    window.location.origin
  ),

  // OAuth2 scopes
  scope: getEnvVar('VITE_OIDC_SCOPE', 'openid profile email'),

  // Response type (always 'code' for authorization code flow)
  responseType: 'code',

  // Code challenge method (always 'S256' for PKCE)
  codeChallengeMethod: 'S256',

  // Automatically refresh tokens before expiration
  automaticSilentRenew: true,

  // Refresh token when this many seconds before expiration (default: 5 minutes)
  refreshThresholdSeconds: parseInt(
    getEnvVar('VITE_OIDC_REFRESH_THRESHOLD', '300'),
    10
  ),
};

// BFF (Backend for Frontend) API endpoints
export const authApiEndpoints = {
  // Base URL for BFF
  baseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:8080'),

  // Auth endpoints
  token: '/api/auth/token',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  user: '/api/auth/user',
  session: '/api/auth/session',
};

// IDP endpoints (used for direct browser redirects)
export const idpEndpoints = {
  // Authorization endpoint
  authorize: `${oidcConfig.authority}/oauth2/authorize`,

  // Logout endpoint
  logout: `${oidcConfig.authority}/oauth2/logout`,

  // OIDC discovery endpoint
  wellKnown: `${oidcConfig.authority}/.well-known/openid-configuration`,
};

// Auth configuration
export const authConfig = {
  // Session timeout (milliseconds) - should match BFF session timeout
  sessionTimeout: 30 * 60 * 1000, // 30 minutes

  // Token refresh check interval (milliseconds)
  refreshCheckInterval: 60 * 1000, // 1 minute

  // Maximum number of token refresh retries
  maxRefreshRetries: 3,

  // Retry delay (milliseconds)
  retryDelay: 1000,

  // Enable debug logging
  debug: getEnvVar('VITE_AUTH_DEBUG', 'false') === 'true',
};

// Validate configuration
export function validateAuthConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!oidcConfig.authority || oidcConfig.authority === 'https://idp.example.com') {
    errors.push('OIDC authority is not configured (VITE_OIDC_AUTHORITY)');
  }

  if (!oidcConfig.clientId || oidcConfig.clientId === 'hs-mono-repo-client') {
    errors.push('OIDC client ID is not configured (VITE_OIDC_CLIENT_ID)');
  }

  if (!authApiEndpoints.baseUrl) {
    errors.push('API base URL is not configured (VITE_API_BASE_URL)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log configuration in development
if (authConfig.debug) {
  console.log('[Auth Config]', {
    authority: oidcConfig.authority,
    clientId: oidcConfig.clientId,
    redirectUri: oidcConfig.redirectUri,
    scope: oidcConfig.scope,
    bffBaseUrl: authApiEndpoints.baseUrl,
  });

  const validation = validateAuthConfig();
  if (!validation.valid) {
    console.warn('[Auth Config] Configuration issues:', validation.errors);
  }
}
