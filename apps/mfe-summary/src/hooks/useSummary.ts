import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { summaryApi, queryKeys, type SummaryQueryParams } from '@hs-mono-repo/shared-api-client';

/**
 * Hook to fetch and manage user summary/activity data
 */
export function useSummary(params: SummaryQueryParams = {}) {
  const queryClient = useQueryClient();
  const { userId = 'current', timeRange = 'month', limit = 10 } = params;

  // Fetch summary data
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.summary.filtered(userId, { timeRange, limit }),
    queryFn: () => summaryApi.getSummary({ userId, timeRange, limit }),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
  });

  // Refresh summary mutation
  const refreshMutation = useMutation({
    mutationFn: () => summaryApi.refreshSummary(userId),
    onSuccess: (updatedSummary) => {
      // Update cache with refreshed data
      queryClient.setQueryData(
        queryKeys.summary.filtered(userId, { timeRange, limit }),
        updatedSummary
      );

      // Invalidate all summary queries for this user
      queryClient.invalidateQueries({
        queryKey: queryKeys.summary.byUserId(userId),
      });
    },
  });

  return {
    // Data
    summary,
    isLoading,
    isError,
    error,

    // Actions
    refreshSummary: refreshMutation.mutate,
    refetch,

    // Mutation state
    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error,
  };
}
