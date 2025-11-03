/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow.
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

import type { PKCEParams } from '../types';

/**
 * Generate a cryptographically random string for code_verifier
 *
 * Requirements (RFC 7636):
 * - Length: 43-128 characters
 * - Characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
export function generateCodeVerifier(length = 128): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);

  // Use crypto.getRandomValues for cryptographically secure random numbers
  crypto.getRandomValues(randomValues);

  let codeVerifier = '';
  for (let i = 0; i < length; i++) {
    codeVerifier += charset[randomValues[i] % charset.length];
  }

  return codeVerifier;
}

/**
 * Generate code_challenge from code_verifier
 *
 * Uses S256 method: BASE64URL(SHA256(ASCII(code_verifier)))
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert hash to base64url encoding
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

/**
 * Base64 URL encoding (without padding)
 *
 * Standard base64 encoding, but replace:
 * - '+' with '-'
 * - '/' with '_'
 * - Remove padding '='
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert buffer to binary string
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }

  // Base64 encode
  const base64 = btoa(binary);

  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  return base64UrlEncode(randomValues);
}

/**
 * Generate complete PKCE parameters
 *
 * Returns code_verifier, code_challenge, code_challenge_method, and state
 */
export async function generatePKCEParams(): Promise<PKCEParams> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
    state,
  };
}

/**
 * Validate code_verifier format
 *
 * Must be 43-128 characters from the allowed charset
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  const validCharset = /^[A-Za-z0-9\-._~]+$/;
  return validCharset.test(codeVerifier);
}

/**
 * Validate state parameter
 */
export function isValidState(state: string): boolean {
  return state.length > 0 && /^[A-Za-z0-9\-_]+$/.test(state);
}
