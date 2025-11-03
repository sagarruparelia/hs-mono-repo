/**
 * useAuth Hook
 *
 * Provides easy access to authentication state and methods.
 */

import { useContext } from 'react';
import { AuthContext } from '../AuthContext';
import type { AuthContextType } from '../types';

/**
 * Hook to access authentication context
 *
 * Must be used within AuthProvider
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

/**
 * Hook to check if user is authenticated
 *
 * @returns true if user is logged in
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook to get current user
 *
 * @returns Current user or null if not authenticated
 */
export function useCurrentUser() {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check user roles
 *
 * @param role Single role to check
 * @returns true if user has the role
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

/**
 * Hook to check user permissions
 *
 * @param permission Single permission to check
 * @returns true if user has the permission
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook to check multiple roles (ANY)
 *
 * @param roles Array of roles to check
 * @returns true if user has ANY of the roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { hasAnyRole } = useAuth();
  return hasAnyRole(roles);
}

/**
 * Hook to check multiple roles (ALL)
 *
 * @param roles Array of roles to check
 * @returns true if user has ALL of the roles
 */
export function useHasAllRoles(roles: string[]): boolean {
  const { hasAllRoles } = useAuth();
  return hasAllRoles(roles);
}
