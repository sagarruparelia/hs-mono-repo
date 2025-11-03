import type {
  ProfileData,
  UpdateProfileRequest,
  SummaryData,
  SummaryQueryParams,
  ApiResponse,
  ApiError,
} from './types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Custom API Error Class
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Generic fetch wrapper with error handling
async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeout = API_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiError;
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

// Profile API
export const profileApi = {
  /**
   * Get user profile by ID
   */
  getProfile: async (userId: string): Promise<ProfileData> => {
    return fetchWithTimeout<ProfileData>(
      `${API_BASE_URL}/api/profile/${userId}`
    );
  },

  /**
   * Update user profile
   */
  updateProfile: async (
    userId: string,
    data: UpdateProfileRequest
  ): Promise<ProfileData> => {
    return fetchWithTimeout<ProfileData>(
      `${API_BASE_URL}/api/profile/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Upload profile avatar
   */
  uploadAvatar: async (userId: string, file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${API_BASE_URL}/api/profile/${userId}/avatar`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary for multipart
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
};

// Summary API
export const summaryApi = {
  /**
   * Get user summary/activity data
   */
  getSummary: async (params: SummaryQueryParams = {}): Promise<SummaryData> => {
    const { userId = 'current', timeRange = 'month', limit = 10 } = params;

    const queryParams = new URLSearchParams({
      timeRange,
      limit: limit.toString(),
    });

    return fetchWithTimeout<SummaryData>(
      `${API_BASE_URL}/api/summary/${userId}?${queryParams}`
    );
  },

  /**
   * Refresh summary data
   */
  refreshSummary: async (userId: string): Promise<SummaryData> => {
    return fetchWithTimeout<SummaryData>(
      `${API_BASE_URL}/api/summary/${userId}/refresh`,
      {
        method: 'POST',
      }
    );
  },
};

// Health Check API
export const healthApi = {
  /**
   * Check API health status
   */
  check: async (): Promise<{ status: string; timestamp: string }> => {
    return fetchWithTimeout(
      `${API_BASE_URL}/api/health`,
      {},
      5000 // Shorter timeout for health checks
    );
  },
};

// Export all APIs
export const apiClient = {
  profile: profileApi,
  summary: summaryApi,
  health: healthApi,
};
