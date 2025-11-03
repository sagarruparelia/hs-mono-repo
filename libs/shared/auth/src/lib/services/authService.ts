/**
 * Auth Service
 *
 * Handles all authentication-related API calls to the BFF.
 * Frontend only does UI orchestration, BFF handles all auth logic.
 */

import { authApiEndpoints } from '../config';
import type {
  TokenExchangeRequest,
  TokenExchangeResponse,
  TokenRefreshResponse,
  SessionInfo,
  User,
  AuthError,
} from '../types';

/**
 * Custom error class for auth API errors
 */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/**
 * Fetch wrapper with error handling
 */
async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${authApiEndpoints.baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Always include cookies
    });

    // Handle non-OK responses
    if (!response.ok) {
      let error: AuthError;
      try {
        error = await response.json();
      } catch {
        error = {
          code: 'NETWORK_ERROR',
          message: response.statusText || 'Request failed',
        };
      }

      throw new AuthApiError(
        error.message,
        response.status,
        error.code,
        error.details
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    // Network error or other
    throw new AuthApiError(
      error instanceof Error ? error.message : 'Unknown error',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Auth Service - All BFF auth API calls
 */
export const authService = {
  /**
   * Exchange authorization code for session
   *
   * Frontend calls this after receiving code from IDP.
   * BFF handles token exchange, session creation, and returns user info.
   *
   * @param request - Code and code verifier from PKCE flow
   * @returns User info and session details
   */
  async exchangeToken(
    request: TokenExchangeRequest
  ): Promise<TokenExchangeResponse> {
    return authFetch<TokenExchangeResponse>(authApiEndpoints.token, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get current user from session
   *
   * BFF extracts session from HTTP-only cookie and returns user info.
   *
   * @returns Current user or throws if not authenticated
   */
  async getCurrentUser(): Promise<User> {
    return authFetch<User>(authApiEndpoints.user, {
      method: 'GET',
    });
  },

  /**
   * Get current session info
   *
   * @returns Session details including expiration
   */
  async getSession(): Promise<SessionInfo> {
    return authFetch<SessionInfo>(authApiEndpoints.session, {
      method: 'GET',
    });
  },

  /**
   * Refresh session
   *
   * BFF handles token refresh with IDP automatically.
   * Frontend just needs to call this endpoint periodically.
   *
   * @returns New expiration time
   */
  async refreshSession(): Promise<TokenRefreshResponse> {
    return authFetch<TokenRefreshResponse>(authApiEndpoints.refresh, {
      method: 'POST',
    });
  },

  /**
   * Logout
   *
   * BFF handles:
   * - Token revocation at IDP
   * - Session deletion in Redis
   * - Cookie clearing
   *
   * @returns Logout redirect URL (optional)
   */
  async logout(): Promise<{ logoutUrl?: string }> {
    return authFetch<{ logoutUrl?: string }>(authApiEndpoints.logout, {
      method: 'POST',
    });
  },

  /**
   * Check if user is authenticated
   *
   * Quick check without fetching full user data
   *
   * @returns true if valid session exists
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getSession();
      return true;
    } catch (error) {
      if (error instanceof AuthApiError && error.statusCode === 401) {
        return false;
      }
      // Other errors might be network issues, don't assume unauthenticated
      throw error;
    }
  },
};

/**
 * Parse auth error into user-friendly message
 */
export function parseAuthError(error: unknown): AuthError {
  if (error instanceof AuthApiError) {
    return {
      code: error.code as any,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
  };
}
