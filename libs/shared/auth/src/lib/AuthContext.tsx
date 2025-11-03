/**
 * Auth Context
 *
 * Provides authentication state and methods to the entire application.
 * Used only in shell applications (web-cl, web-hs), NOT in MFEs.
 */

import { createContext } from 'react';
import type { AuthContextType } from './types';

/**
 * Auth Context
 *
 * Default values indicate unauthenticated state
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  sessionExpiresAt: null,

  login: () => {
    throw new Error('AuthContext not initialized');
  },
  logout: async () => {
    throw new Error('AuthContext not initialized');
  },
  refreshToken: async () => {
    throw new Error('AuthContext not initialized');
  },
  hasRole: () => false,
  hasPermission: () => false,
  hasAnyRole: () => false,
  hasAllRoles: () => false,
});

AuthContext.displayName = 'AuthContext';
