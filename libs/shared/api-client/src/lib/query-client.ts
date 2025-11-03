import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';

/**
 * Default Query Client Configuration
 *
 * Optimized settings for micro-frontend architecture with BFF integration.
 */
export const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Stale time: Data considered fresh for 30 seconds
      staleTime: 30 * 1000,

      // Cache time: Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx errors
        return failureCount < 2;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,

      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
};

/**
 * Create a new QueryClient instance with default configuration
 */
export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...defaultQueryClientConfig,
    ...config,
    defaultOptions: {
      ...defaultQueryClientConfig.defaultOptions,
      ...config?.defaultOptions,
      queries: {
        ...defaultQueryClientConfig.defaultOptions?.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...defaultQueryClientConfig.defaultOptions?.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

/**
 * Singleton QueryClient for shared usage across MFEs
 *
 * This allows multiple MFEs loaded in the same shell to share the same cache.
 * Use this when you want cache sharing between remotes.
 */
let sharedQueryClient: QueryClient | null = null;

export function getSharedQueryClient(): QueryClient {
  if (!sharedQueryClient) {
    sharedQueryClient = createQueryClient();
  }
  return sharedQueryClient;
}

/**
 * Reset the shared query client (useful for testing or logout scenarios)
 */
export function resetSharedQueryClient(): void {
  if (sharedQueryClient) {
    sharedQueryClient.clear();
    sharedQueryClient = null;
  }
}
