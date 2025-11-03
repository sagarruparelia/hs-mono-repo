/**
 * Auth Provider
 *
 * Manages authentication state for shell applications.
 * Handles OIDC PKCE flow orchestration (UI only, BFF does the heavy lifting).
 *
 * Features:
 * - Initiates login (PKCE generation + redirect)
 * - Handles callback (sends code to BFF)
 * - Stores user info in context (from BFF)
 * - Automatic session refresh
 * - Logout
 */

import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AuthContext } from './AuthContext';
import { oidcConfig, authConfig } from './config';
import { generatePKCEParams } from './utils/pkce';
import {
  authStorage,
  buildAuthorizationUrl,
  parseCallbackUrl,
  validateCallbackState,
  clearCallbackParams,
} from './utils/storage';
import { authService, parseAuthError } from './services/authService';
import type { AuthState, User, AuthError } from './types';

export interface AuthProviderProps {
  children: ReactNode;
  onAuthError?: (error: AuthError) => void;
  onSessionExpired?: () => void;
}

/**
 * Auth Provider Component
 *
 * Wrap your app with this component to enable authentication.
 * Used ONLY in shell apps, NOT in MFEs.
 */
export function AuthProvider({
  children,
  onAuthError,
  onSessionExpired,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    sessionExpiresAt: null,
  });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingCallbackRef = useRef(false);

  /**
   * Initialize auth state
   *
   * Checks if user has active session on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      // Check if this is a callback from IDP
      const callbackParams = parseCallbackUrl();

      if (callbackParams.code && !isHandlingCallbackRef.current) {
        // Handle OAuth callback
        isHandlingCallbackRef.current = true;
        await handleCallback();
        return;
      }

      if (callbackParams.error) {
        // IDP returned an error
        const error: AuthError = {
          code: 'IDP_ERROR',
          message: callbackParams.errorDescription || callbackParams.error,
        };
        setState(prev => ({ ...prev, isLoading: false, error }));
        onAuthError?.(error);
        return;
      }

      // Check for existing session
      try {
        const user = await authService.getCurrentUser();
        const session = await authService.getSession();

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          sessionExpiresAt: session.expiresAt,
        });

        // Start refresh timer
        startRefreshTimer(session.expiresAt);
      } catch (error) {
        // No valid session
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          sessionExpiresAt: null,
        });
      }
    };

    initAuth();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  /**
   * Handle OAuth callback
   *
   * Called when IDP redirects back with authorization code
   */
  const handleCallback = async () => {
    try {
      const callbackParams = parseCallbackUrl();

      if (!callbackParams.code || !callbackParams.state) {
        throw new Error('Missing code or state parameter');
      }

      // Validate state (CSRF protection)
      if (!validateCallbackState(callbackParams.state)) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      // Get code verifier from storage
      const codeVerifier = authStorage.getCodeVerifier();
      if (!codeVerifier) {
        throw new Error('Missing code verifier');
      }

      // Exchange code for session (BFF handles token exchange)
      const response = await authService.exchangeToken({
        code: callbackParams.code,
        codeVerifier,
        redirectUri: oidcConfig.redirectUri,
      });

      // Update state with user info
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        sessionExpiresAt: response.expiresAt,
      });

      // Clean up
      authStorage.clearAll();
      clearCallbackParams();

      // Start refresh timer
      startRefreshTimer(response.expiresAt);

      // Redirect to original path
      const redirectPath = authStorage.getRedirectPath() || '/';
      authStorage.removeRedirectPath();
      window.history.replaceState({}, '', redirectPath);
    } catch (error) {
      const authError = parseAuthError(error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: authError,
      }));
      onAuthError?.(authError);

      // Clean up
      authStorage.clearAll();
      clearCallbackParams();
    } finally {
      isHandlingCallbackRef.current = false;
    }
  };

  /**
   * Initiate login
   *
   * Generates PKCE params and redirects to IDP
   */
  const login = useCallback(async (redirectPath?: string) => {
    try {
      // Store redirect path for after login
      if (redirectPath) {
        authStorage.setRedirectPath(redirectPath);
      } else {
        authStorage.setRedirectPath(window.location.pathname);
      }

      // Generate PKCE parameters
      const pkceParams = await generatePKCEParams();

      // Store for later use
      authStorage.setCodeVerifier(pkceParams.codeVerifier);
      authStorage.setState(pkceParams.state);

      // Build authorization URL
      const authUrl = buildAuthorizationUrl({
        authority: oidcConfig.authority,
        clientId: oidcConfig.clientId,
        redirectUri: oidcConfig.redirectUri,
        scope: oidcConfig.scope,
        state: pkceParams.state,
        codeChallenge: pkceParams.codeChallenge,
        codeChallengeMethod: pkceParams.codeChallengeMethod,
      });

      // Redirect to IDP
      window.location.href = authUrl;
    } catch (error) {
      const authError = parseAuthError(error);
      setState(prev => ({ ...prev, error: authError }));
      onAuthError?.(authError);
    }
  }, [onAuthError]);

  /**
   * Logout
   *
   * BFF handles token revocation and session cleanup
   */
  const logout = useCallback(async () => {
    try {
      // Stop refresh timer
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Call BFF logout endpoint
      const response = await authService.logout();

      // Clear local state
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        sessionExpiresAt: null,
      });

      authStorage.clearAll();

      // Redirect to IDP logout if provided
      if (response.logoutUrl) {
        window.location.href = response.logoutUrl;
      }
    } catch (error) {
      const authError = parseAuthError(error);
      setState(prev => ({ ...prev, error: authError }));
      onAuthError?.(authError);
    }
  }, [onAuthError]);

  /**
   * Refresh token
   *
   * BFF handles actual token refresh with IDP
   */
  const refreshToken = useCallback(async () => {
    try {
      const response = await authService.refreshSession();

      setState(prev => ({
        ...prev,
        sessionExpiresAt: response.expiresAt,
      }));

      // Restart refresh timer with new expiration
      startRefreshTimer(response.expiresAt);
    } catch (error) {
      const authError = parseAuthError(error);

      if (authError.code === 'SESSION_EXPIRED' || authError.code === 'UNAUTHORIZED') {
        // Session expired, trigger logout
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: authError,
          sessionExpiresAt: null,
        });
        onSessionExpired?.();
      } else {
        setState(prev => ({ ...prev, error: authError }));
        onAuthError?.(authError);
      }
    }
  }, [onAuthError, onSessionExpired]);

  /**
   * Start automatic token refresh timer
   *
   * Refreshes token before it expires
   */
  const startRefreshTimer = (expiresAt: number) => {
    // Clear existing timer
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Calculate when to refresh (before expiration)
    const now = Date.now();
    const expiresIn = expiresAt - now;
    const refreshThreshold = (oidcConfig.refreshThresholdSeconds || 300) * 1000;

    // If already expired or about to expire, refresh immediately
    if (expiresIn <= refreshThreshold) {
      refreshToken();
      return;
    }

    // Set timer to refresh before expiration
    const refreshIn = expiresIn - refreshThreshold;

    refreshIntervalRef.current = setTimeout(() => {
      refreshToken();
    }, refreshIn);

    if (authConfig.debug) {
      console.log(`[Auth] Refresh scheduled in ${Math.round(refreshIn / 1000)}s`);
    }
  };

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return state.user?.roles.includes(role) ?? false;
    },
    [state.user]
  );

  /**
   * Check if user has specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return state.user?.permissions?.includes(permission) ?? false;
    },
    [state.user]
  );

  /**
   * Check if user has ANY of the roles
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      return roles.some(role => hasRole(role));
    },
    [hasRole]
  );

  /**
   * Check if user has ALL of the roles
   */
  const hasAllRoles = useCallback(
    (roles: string[]): boolean => {
      return roles.every(role => hasRole(role));
    },
    [hasRole]
  );

  const contextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
