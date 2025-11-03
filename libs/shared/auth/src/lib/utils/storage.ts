/**
 * Storage Utilities for Authentication
 *
 * Manages temporary storage of PKCE parameters and auth state.
 * Uses sessionStorage for security (cleared when tab closes).
 */

import { AUTH_STORAGE_KEYS } from '../types';

/**
 * Storage manager with type-safe keys
 */
export const authStorage = {
  /**
   * Store code verifier (used during token exchange)
   */
  setCodeVerifier(codeVerifier: string): void {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
    } catch (error) {
      console.error('[Auth Storage] Failed to store code verifier:', error);
    }
  },

  /**
   * Get code verifier
   */
  getCodeVerifier(): string | null {
    try {
      return sessionStorage.getItem(AUTH_STORAGE_KEYS.CODE_VERIFIER);
    } catch (error) {
      console.error('[Auth Storage] Failed to get code verifier:', error);
      return null;
    }
  },

  /**
   * Remove code verifier (after token exchange)
   */
  removeCodeVerifier(): void {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.CODE_VERIFIER);
    } catch (error) {
      console.error('[Auth Storage] Failed to remove code verifier:', error);
    }
  },

  /**
   * Store state parameter (for CSRF protection)
   */
  setState(state: string): void {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.STATE, state);
    } catch (error) {
      console.error('[Auth Storage] Failed to store state:', error);
    }
  },

  /**
   * Get state parameter
   */
  getState(): string | null {
    try {
      return sessionStorage.getItem(AUTH_STORAGE_KEYS.STATE);
    } catch (error) {
      console.error('[Auth Storage] Failed to get state:', error);
      return null;
    }
  },

  /**
   * Remove state (after validation)
   */
  removeState(): void {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.STATE);
    } catch (error) {
      console.error('[Auth Storage] Failed to remove state:', error);
    }
  },

  /**
   * Store redirect path (where to go after login)
   */
  setRedirectPath(path: string): void {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.REDIRECT_PATH, path);
    } catch (error) {
      console.error('[Auth Storage] Failed to store redirect path:', error);
    }
  },

  /**
   * Get redirect path
   */
  getRedirectPath(): string | null {
    try {
      return sessionStorage.getItem(AUTH_STORAGE_KEYS.REDIRECT_PATH);
    } catch (error) {
      console.error('[Auth Storage] Failed to get redirect path:', error);
      return null;
    }
  },

  /**
   * Remove redirect path
   */
  removeRedirectPath(): void {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.REDIRECT_PATH);
    } catch (error) {
      console.error('[Auth Storage] Failed to remove redirect path:', error);
    }
  },

  /**
   * Store last activity timestamp (for session monitoring)
   */
  setLastActivity(timestamp: number = Date.now()): void {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.LAST_ACTIVITY, timestamp.toString());
    } catch (error) {
      console.error('[Auth Storage] Failed to store last activity:', error);
    }
  },

  /**
   * Get last activity timestamp
   */
  getLastActivity(): number | null {
    try {
      const value = sessionStorage.getItem(AUTH_STORAGE_KEYS.LAST_ACTIVITY);
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('[Auth Storage] Failed to get last activity:', error);
      return null;
    }
  },

  /**
   * Clear all auth-related storage
   */
  clearAll(): void {
    try {
      Object.values(AUTH_STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('[Auth Storage] Failed to clear storage:', error);
    }
  },

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Build authorization URL with PKCE parameters
 */
export function buildAuthorizationUrl(params: {
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  prompt?: string;
}): string {
  const url = new URL(`${params.authority}/oauth2/authorize`);

  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', params.scope);
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', params.codeChallengeMethod);

  if (params.prompt) {
    url.searchParams.set('prompt', params.prompt);
  }

  return url.toString();
}

/**
 * Parse callback URL parameters
 */
export function parseCallbackUrl(
  url: string = window.location.href
): {
  code: string | null;
  state: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  return {
    code: params.get('code'),
    state: params.get('state'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

/**
 * Validate callback state matches stored state
 */
export function validateCallbackState(callbackState: string): boolean {
  const storedState = authStorage.getState();

  if (!storedState) {
    console.error('[Auth] No stored state found');
    return false;
  }

  if (callbackState !== storedState) {
    console.error('[Auth] State mismatch - possible CSRF attack');
    return false;
  }

  return true;
}

/**
 * Clear callback URL parameters (remove code, state from URL)
 */
export function clearCallbackParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');

  window.history.replaceState({}, document.title, url.toString());
}
