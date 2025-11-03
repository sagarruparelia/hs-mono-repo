/**
 * Query Key Factory
 *
 * Centralized query key management for consistent caching across all MFEs.
 * Using a factory pattern ensures type safety and prevents key collisions.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

import type { SummaryQueryParams } from './types';

export const queryKeys = {
  /**
   * Health check keys
   */
  health: {
    all: ['health'] as const,
    check: () => [...queryKeys.health.all, 'check'] as const,
  },

  /**
   * Profile keys
   */
  profile: {
    all: ['profile'] as const,
    byUserId: (userId: string) => [...queryKeys.profile.all, userId] as const,
    avatar: (userId: string) => [...queryKeys.profile.byUserId(userId), 'avatar'] as const,
  },

  /**
   * Summary keys
   */
  summary: {
    all: ['summary'] as const,
    byUserId: (userId: string) => [...queryKeys.summary.all, userId] as const,
    filtered: (userId: string, params: SummaryQueryParams) =>
      [...queryKeys.summary.byUserId(userId), params] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for a specific user
 */
export const getUserQueryKeys = (userId: string) => ({
  profile: queryKeys.profile.byUserId(userId),
  summary: queryKeys.summary.byUserId(userId),
});

/**
 * Type-safe query key utilities
 */
export type QueryKey = ReturnType<
  | typeof queryKeys.health.check
  | typeof queryKeys.profile.byUserId
  | typeof queryKeys.profile.avatar
  | typeof queryKeys.summary.byUserId
  | typeof queryKeys.summary.filtered
>;
