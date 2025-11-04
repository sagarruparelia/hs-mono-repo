/**
 * Enhanced API Client with Optional Authentication
 *
 * Supports two modes:
 * 1. Shell apps: Uses HTTP-only cookies (automatic)
 * 2. 3rd party sites: Uses getAccessToken function
 */

import type {
  ProfileData,
  UpdateProfileRequest,
  SummaryData,
  SummaryQueryParams,
} from './types';
import { ApiClientError } from './api-client';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

/**
 * Optional authentication configuration
 */
export interface AuthConfig {
  /**
   * Function to get access token
   * Used for 3rd party integrations
   */
  getAccessToken?: () => Promise<string> | string;

  /**
   * Custom headers (e.g., CSRF token)
   */
  customHeaders?: Record<string, string>;
}

/**
 * Enhanced fetch wrapper with optional auth
 */
async function fetchWithAuth<T>(
  url: string,
  authConfig?: AuthConfig,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add custom headers if provided (CSRF, etc.)
    if (authConfig?.customHeaders) {
      Object.assign(headers, authConfig.customHeaders);
    }

    // Add Authorization header if getAccessToken provided
    if (authConfig?.getAccessToken) {
      try {
        const token = await authConfig.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[API Client] Failed to get access token:', error);
        // Continue without token - let backend handle auth error
      }
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
      credentials: 'include', // Always include cookies
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          message: response.statusText || 'An error occurred',
          status: response.status,
        };
      }

      throw new ApiClientError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.errors
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiClientError('Request timeout', 408);
      }
      throw new ApiClientError(error.message, 0);
    }

    throw new ApiClientError('Unknown error occurred', 0);
  }
}

/**
 * Create API client with optional auth configuration
 */
export function createApiClient(authConfig?: AuthConfig) {
  return {
    /**
     * Profile API
     */
    profile: {
      getProfile: async (userId: string): Promise<ProfileData> => {
        return fetchWithAuth<ProfileData>(
          `${API_BASE_URL}/api/profile/${userId}`,
          authConfig
        );
      },

      updateProfile: async (
        userId: string,
        data: UpdateProfileRequest
      ): Promise<ProfileData> => {
        return fetchWithAuth<ProfileData>(
          `${API_BASE_URL}/api/profile/${userId}`,
          authConfig,
          {
            method: 'PUT',
            body: JSON.stringify(data),
          }
        );
      },

      uploadAvatar: async (userId: string, file: File): Promise<{ avatarUrl: string }> => {
        const formData = new FormData();
        formData.append('avatar', file);

        // Build headers without Content-Type (browser sets it for multipart)
        const headers: Record<string, string> = {};

        if (authConfig?.customHeaders) {
          Object.assign(headers, authConfig.customHeaders);
        }

        if (authConfig?.getAccessToken) {
          try {
            const token = await authConfig.getAccessToken();
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
          } catch (error) {
            console.warn('[API Client] Failed to get access token:', error);
          }
        }

        const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/avatar`, {
          method: 'POST',
          body: formData,
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: response.statusText,
            status: response.status,
          }));
          throw new ApiClientError(
            errorData.message || 'Avatar upload failed',
            response.status
          );
        }

        return response.json();
      },
    },

    /**
     * Summary API
     */
    summary: {
      getSummary: async (params: SummaryQueryParams = {}): Promise<SummaryData> => {
        const { userId = 'current', timeRange = 'month', limit = 10 } = params;

        const queryParams = new URLSearchParams({
          timeRange,
          limit: limit.toString(),
        });

        return fetchWithAuth<SummaryData>(
          `${API_BASE_URL}/api/summary/${userId}?${queryParams}`,
          authConfig
        );
      },

      refreshSummary: async (userId: string): Promise<SummaryData> => {
        return fetchWithAuth<SummaryData>(
          `${API_BASE_URL}/api/summary/${userId}/refresh`,
          authConfig,
          {
            method: 'POST',
          }
        );
      },
    },
  };
}

/**
 * Default API client (for shell apps using cookies)
 */
export const enhancedApiClient = createApiClient();
