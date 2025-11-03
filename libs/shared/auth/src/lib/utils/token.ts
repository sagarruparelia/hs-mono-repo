/**
 * JWT Token Utilities
 *
 * Functions for decoding and validating JWT tokens.
 * Note: This is for CLIENT-SIDE inspection only.
 * Server-side validation is required for security.
 */

import type { User } from '../types';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  // Standard claims (RFC 7519)
  iss?: string; // Issuer
  sub?: string; // Subject (user ID)
  aud?: string | string[]; // Audience
  exp?: number; // Expiration time (Unix timestamp)
  nbf?: number; // Not before (Unix timestamp)
  iat?: number; // Issued at (Unix timestamp)
  jti?: string; // JWT ID

  // OpenID Connect claims
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;

  // Custom claims
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

/**
 * Decode JWT token without verification
 *
 * WARNING: This only decodes the token, it does NOT verify the signature.
 * Token validation must be done server-side for security.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format');
      return null;
    }

    // Decode payload (second part)
    const payload = parts[1];

    // Base64URL decode
    const decoded = base64UrlDecode(payload);

    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error);
    return null;
  }
}

/**
 * Base64 URL decode
 */
function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }

  // Decode base64
  try {
    return atob(base64);
  } catch (error) {
    throw new Error('Invalid base64 string');
  }
}

/**
 * Check if JWT token is expired
 *
 * @param token JWT token string
 * @param bufferSeconds Optional buffer time (default: 60 seconds)
 * @returns true if token is expired or will expire within buffer time
 */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return payload.exp - bufferSeconds <= now;
}

/**
 * Get token expiration time in seconds
 *
 * @returns Seconds until token expires, or 0 if expired/invalid
 */
export function getTokenExpiresIn(token: string): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;
  return Math.max(0, expiresIn);
}

/**
 * Extract user information from ID token
 *
 * @param idToken OpenID Connect ID token
 * @returns User object or null if invalid
 */
export function getUserFromIDToken(idToken: string): User | null {
  const payload = decodeJWT(idToken);
  if (!payload || !payload.sub) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email || '',
    name: payload.name || payload.email || 'Unknown User',
    firstName: payload.given_name,
    lastName: payload.family_name,
    avatar: payload.picture,
    roles: payload.roles || [],
    permissions: payload.permissions,
    metadata: {
      emailVerified: payload.email_verified,
      issuer: payload.iss,
      issuedAt: payload.iat,
    },
  };
}

/**
 * Validate token format (basic check)
 *
 * This only checks if the token has the correct structure.
 * It does NOT verify the signature or claims.
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT must have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Each part should be base64url encoded
  const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
  return parts.every(part => base64UrlPattern.test(part));
}

/**
 * Get token claims for debugging
 *
 * Returns all claims from the token payload
 */
export function getTokenClaims(token: string): Record<string, any> | null {
  const payload = decodeJWT(token);
  return payload;
}

/**
 * Check if token has specific role
 */
export function tokenHasRole(token: string, role: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.roles) {
    return false;
  }

  return Array.isArray(payload.roles) && payload.roles.includes(role);
}

/**
 * Check if token has specific permission
 */
export function tokenHasPermission(token: string, permission: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.permissions) {
    return false;
  }

  return Array.isArray(payload.permissions) && payload.permissions.includes(permission);
}
