import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, queryKeys, type ProfileData, type UpdateProfileRequest } from '@hs-mono-repo/shared-api-client';

/**
 * Hook to fetch and manage user profile data
 */
export function useProfile(userId: string) {
  const queryClient = useQueryClient();

  // Fetch profile data
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile.byUserId(userId),
    queryFn: () => profileApi.getProfile(userId),
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    retry: 2,
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileApi.updateProfile(userId, data),
    onSuccess: (updatedProfile) => {
      // Update the cache with new data
      queryClient.setQueryData(queryKeys.profile.byUserId(userId), updatedProfile);

      // Invalidate related queries if needed
      queryClient.invalidateQueries({
        queryKey: queryKeys.summary.byUserId(userId),
      });
    },
  });

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(userId, file),
    onSuccess: (data) => {
      // Update avatar in cache
      queryClient.setQueryData<ProfileData>(
        queryKeys.profile.byUserId(userId),
        (old) => (old ? { ...old, avatar: data.avatarUrl } : undefined)
      );
    },
  });

  return {
    // Data
    profile,
    isLoading,
    isError,
    error,

    // Actions
    updateProfile: updateMutation.mutate,
    uploadAvatar: uploadAvatarMutation.mutate,
    refetch,

    // Mutation states
    isUpdating: updateMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    updateError: updateMutation.error,
    uploadError: uploadAvatarMutation.error,
  };
}
