/**
 * Protected Route Component
 *
 * Wraps routes that require authentication and/or specific roles/permissions.
 * Redirects to login if not authenticated.
 * Shows forbidden message if insufficient permissions.
 */

import { useEffect, type ReactNode } from 'react';
import { useAuth } from './hooks/useAuth';
import type { ProtectedRouteProps } from './types';

/**
 * Protected Route Component
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute requiredRoles={['ADMIN']}>
 *   <AdminDashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyRole, hasAllRoles, user, login } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      login(redirectTo || currentPath);
    }
  }, [isLoading, isAuthenticated, login, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="protected-route-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="protected-route-unauthenticated">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAll
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles);

    if (!hasRequiredRoles) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <ForbiddenMessage
          message="You don't have the required role to access this page."
          requiredRoles={requiredRoles}
          userRoles={user?.roles || []}
        />
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(p => user?.permissions?.includes(p))
      : requiredPermissions.some(p => user?.permissions?.includes(p));

    if (!hasRequiredPermissions) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <ForbiddenMessage
          message="You don't have the required permission to access this page."
          requiredPermissions={requiredPermissions}
          userPermissions={user?.permissions || []}
        />
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

/**
 * Forbidden Message Component
 */
function ForbiddenMessage({
  message,
  requiredRoles,
  userRoles,
  requiredPermissions,
  userPermissions,
}: {
  message: string;
  requiredRoles?: string[];
  userRoles?: string[];
  requiredPermissions?: string[];
  userPermissions?: string[];
}) {
  return (
    <div className="protected-route-forbidden">
      <div className="forbidden-content">
        <h1>403 - Forbidden</h1>
        <p>{message}</p>

        {requiredRoles && requiredRoles.length > 0 && (
          <div className="forbidden-details">
            <p>
              <strong>Required roles:</strong> {requiredRoles.join(', ')}
            </p>
            <p>
              <strong>Your roles:</strong>{' '}
              {userRoles && userRoles.length > 0 ? userRoles.join(', ') : 'None'}
            </p>
          </div>
        )}

        {requiredPermissions && requiredPermissions.length > 0 && (
          <div className="forbidden-details">
            <p>
              <strong>Required permissions:</strong> {requiredPermissions.join(', ')}
            </p>
            <p>
              <strong>Your permissions:</strong>{' '}
              {userPermissions && userPermissions.length > 0
                ? userPermissions.join(', ')
                : 'None'}
            </p>
          </div>
        )}

        <a href="/" className="back-home-link">
          ← Back to Home
        </a>
      </div>

      <style>{`
        .protected-route-loading,
        .protected-route-unauthenticated,
        .protected-route-forbidden {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 2rem;
        }

        .forbidden-content {
          max-width: 600px;
          text-align: center;
        }

        .forbidden-content h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: #dc3545;
        }

        .forbidden-content p {
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
          color: #666;
        }

        .forbidden-details {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: left;
        }

        .forbidden-details p {
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }

        .forbidden-details strong {
          color: #333;
        }

        .back-home-link {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          transition: background-color 0.3s;
        }

        .back-home-link:hover {
          background-color: #0056b3;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Higher-Order Component version of ProtectedRoute
 *
 * Usage:
 * ```tsx
 * const ProtectedAdmin = withAuth(AdminDashboard, { requiredRoles: ['ADMIN'] });
 * ```
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
