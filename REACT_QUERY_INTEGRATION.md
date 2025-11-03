# React Query Integration Guide

Complete guide for using `@tanstack/react-query` in the HS Mono Repo micro-frontends architecture.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Client](#api-client)
- [Query Keys](#query-keys)
- [Custom Hooks](#custom-hooks)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

We use **@tanstack/react-query v5** for server state management across all micro-frontends. This provides:

- **Automatic Caching**: Data is cached and shared across MFEs
- **Background Refetching**: Stale data is automatically refreshed
- **Optimistic Updates**: UI updates immediately before server confirms
- **Request Deduplication**: Multiple components requesting same data only triggers one request
- **DevTools**: Visual debugging of queries and cache

### Key Benefits for Micro-Frontends

1. **Shared Cache**: Profile and Summary MFEs share the same query cache when loaded in shells
2. **Singleton QueryClient**: One QueryClient instance across all remotes
3. **Automatic Synchronization**: Updates in one MFE reflect in others instantly
4. **Framework Agnostic**: Can be integrated into any framework

## 🏗 Architecture

### Package Structure

```
libs/shared/api-client/
├── src/
│   ├── lib/
│   │   ├── api-client.ts      # API fetch functions
│   │   ├── types.ts            # TypeScript types
│   │   ├── query-keys.ts       # Query key factory
│   │   └── query-client.ts     # QueryClient configuration
│   └── index.ts                # Public exports
```

### Module Federation Setup

React Query is configured as a **singleton** in Module Federation:

```typescript
// vite.config.ts (all apps)
federation({
  shared: {
    '@tanstack/react-query': {
      singleton: true,
      requiredVersion: '^5.0.0',
    },
  },
})
```

This ensures:
- Only one copy of React Query is loaded
- All MFEs share the same QueryClient instance
- Cache is shared across micro-frontends

## 🚀 Getting Started

### 1. Import Shared API Client

```typescript
import {
  // API functions
  apiClient,
  profileApi,
  summaryApi,

  // Query keys
  queryKeys,

  // QueryClient
  getSharedQueryClient,
  createQueryClient,

  // Types
  type ProfileData,
  type SummaryData,
} from '@hs-mono-repo/shared-api-client';
```

### 2. Wrap App with QueryClientProvider

**Shell Applications** (web-cl, web-hs):

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';

const queryClient = getSharedQueryClient();

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

**Micro-Frontends** (mfe-profile, mfe-summary):

MFEs also wrap their components with QueryClientProvider for standalone usage:

```typescript
export function ProfilePage(props: ProfilePageProps) {
  const queryClient = getSharedQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ProfilePageContent {...props} />
    </QueryClientProvider>
  );
}
```

## 🔌 API Client

### API Structure

The API client is organized by domain:

```typescript
import { apiClient } from '@hs-mono-repo/shared-api-client';

// Profile API
apiClient.profile.getProfile(userId);
apiClient.profile.updateProfile(userId, data);
apiClient.profile.uploadAvatar(userId, file);

// Summary API
apiClient.summary.getSummary({ userId, timeRange, limit });
apiClient.summary.refreshSummary(userId);

// Health API
apiClient.health.check();
```

### Error Handling

All API calls throw `ApiClientError` with:

```typescript
try {
  const profile = await profileApi.getProfile('user-123');
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(error.message);   // User-friendly message
    console.error(error.status);     // HTTP status code
    console.error(error.errors);     // Validation errors (if any)
  }
}
```

### Configuration

API base URL is configured via environment variables:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080

# .env.production
VITE_API_BASE_URL=https://api.example.com
```

## 🔑 Query Keys

### Query Key Factory

Centralized query key management using a factory pattern:

```typescript
import { queryKeys } from '@hs-mono-repo/shared-api-client';

// Health
queryKeys.health.check()
// => ['health', 'check']

// Profile
queryKeys.profile.byUserId('user-123')
// => ['profile', 'user-123']

queryKeys.profile.avatar('user-123')
// => ['profile', 'user-123', 'avatar']

// Summary
queryKeys.summary.byUserId('user-123')
// => ['summary', 'user-123']

queryKeys.summary.filtered('user-123', { timeRange: 'month', limit: 10 })
// => ['summary', 'user-123', { timeRange: 'month', limit: 10 }]
```

### Benefits

- **Type Safety**: TypeScript ensures correct key structure
- **Consistency**: Same keys used across all MFEs
- **Easy Invalidation**: Simple to invalidate related queries
- **Prevents Collisions**: Namespaced keys prevent conflicts

### Invalidating Queries

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@hs-mono-repo/shared-api-client';

const queryClient = useQueryClient();

// Invalidate specific profile
queryClient.invalidateQueries({
  queryKey: queryKeys.profile.byUserId('user-123'),
});

// Invalidate all profiles
queryClient.invalidateQueries({
  queryKey: queryKeys.profile.all,
});

// Invalidate all queries for a user
queryClient.invalidateQueries({
  queryKey: ['profile', 'user-123'],
});
queryClient.invalidateQueries({
  queryKey: ['summary', 'user-123'],
});
```

## 🎣 Custom Hooks

### useProfile Hook

**Location**: `apps/mfe-profile/src/hooks/useProfile.ts`

```typescript
import { useProfile } from '../hooks/useProfile';

function ProfileComponent({ userId }) {
  const {
    // Data
    profile,
    isLoading,
    isError,
    error,

    // Actions
    updateProfile,
    uploadAvatar,
    refetch,

    // Mutation states
    isUpdating,
    isUploadingAvatar,
    updateError,
    uploadError,
  } = useProfile(userId);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{profile.name}</h1>
      <button
        onClick={() => updateProfile({ name: 'New Name' })}
        disabled={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
}
```

**Features**:
- Fetches profile data
- Updates profile with optimistic updates
- Uploads avatar
- Automatic cache invalidation
- Loading and error states

### useSummary Hook

**Location**: `apps/mfe-summary/src/hooks/useSummary.ts`

```typescript
import { useSummary } from '../hooks/useSummary';

function SummaryComponent({ userId, timeRange }) {
  const {
    // Data
    summary,
    isLoading,
    isError,
    error,

    // Actions
    refreshSummary,
    refetch,

    // Mutation state
    isRefreshing,
    refreshError,
  } = useSummary({ userId, timeRange, limit: 10 });

  return (
    <div>
      <h1>Summary for {timeRange}</h1>
      <button
        onClick={() => refreshSummary()}
        disabled={isRefreshing}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
      {summary?.metrics.map(metric => (
        <div key={metric.label}>
          {metric.label}: {metric.value}
        </div>
      ))}
    </div>
  );
}
```

**Features**:
- Fetches summary data with filters
- Refreshes summary on demand
- Automatic cache management
- Query param-based caching

## 💡 Usage Examples

### Example 1: Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { profileApi, queryKeys } from '@hs-mono-repo/shared-api-client';

function UserProfile({ userId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.profile.byUserId(userId),
    queryFn: () => profileApi.getProfile(userId),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.name}</div>;
}
```

### Example 2: Mutation with Optimistic Update

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, queryKeys } from '@hs-mono-repo/shared-api-client';

function UpdateProfileButton({ userId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newData) => profileApi.updateProfile(userId, newData),

    // Optimistic update
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.profile.byUserId(userId),
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData(
        queryKeys.profile.byUserId(userId)
      );

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.profile.byUserId(userId),
        (old) => ({ ...old, ...newData })
      );

      return { previous };
    },

    // Rollback on error
    onError: (err, newData, context) => {
      queryClient.setQueryData(
        queryKeys.profile.byUserId(userId),
        context.previous
      );
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.byUserId(userId),
      });
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: 'New Name' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Updating...' : 'Update Profile'}
    </button>
  );
}
```

### Example 3: Dependent Queries

```typescript
function UserDashboard({ userId }) {
  // First query
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile.byUserId(userId),
    queryFn: () => profileApi.getProfile(userId),
  });

  // Second query depends on first
  const { data: summary } = useQuery({
    queryKey: queryKeys.summary.byUserId(userId),
    queryFn: () => summaryApi.getSummary({ userId }),
    enabled: !!profile, // Only run if profile exists
  });

  return (
    <div>
      {profile && <h1>{profile.name}</h1>}
      {summary && <div>Activities: {summary.metrics.length}</div>}
    </div>
  );
}
```

### Example 4: Polling/Real-time Updates

```typescript
function LiveActivityFeed({ userId }) {
  const { data: summary } = useQuery({
    queryKey: queryKeys.summary.byUserId(userId),
    queryFn: () => summaryApi.getSummary({ userId }),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true, // Continue polling when tab is inactive
  });

  return (
    <div>
      {summary?.recentActivities.map(activity => (
        <div key={activity.id}>{activity.title}</div>
      ))}
    </div>
  );
}
```

### Example 5: Pagination

```typescript
function ActivityList({ userId }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.summary.filtered(userId, { page, pageSize: 10 }),
    queryFn: () => summaryApi.getSummary({ userId, page, limit: 10 }),
    keepPreviousData: true, // Keep showing old data while fetching new page
  });

  return (
    <div>
      {data?.recentActivities.map(activity => (
        <div key={activity.id}>{activity.title}</div>
      ))}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)} disabled={!data?.hasMore}>
        Next
      </button>
    </div>
  );
}
```

## ✅ Best Practices

### 1. Use Query Key Factory

**❌ Bad:**
```typescript
const { data } = useQuery({
  queryKey: ['profile', userId],
  queryFn: () => profileApi.getProfile(userId),
});
```

**✅ Good:**
```typescript
const { data } = useQuery({
  queryKey: queryKeys.profile.byUserId(userId),
  queryFn: () => profileApi.getProfile(userId),
});
```

### 2. Set Appropriate Stale Times

```typescript
useQuery({
  queryKey: queryKeys.profile.byUserId(userId),
  queryFn: () => profileApi.getProfile(userId),

  // User data changes infrequently
  staleTime: 5 * 60 * 1000, // 5 minutes
});

useQuery({
  queryKey: queryKeys.summary.byUserId(userId),
  queryFn: () => summaryApi.getSummary({ userId }),

  // Activity data changes frequently
  staleTime: 30 * 1000, // 30 seconds
});
```

### 3. Handle Loading and Error States

```typescript
function Component() {
  const { data, isLoading, isError, error } = useQuery({...});

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return <DataDisplay data={data} />;
}
```

### 4. Use Mutations for Updates

```typescript
// ❌ Bad: Manually updating cache
queryClient.setQueryData(key, newData);

// ✅ Good: Use mutations
const mutation = useMutation({
  mutationFn: updateFn,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### 5. Share QueryClient Across MFEs

```typescript
// ✅ Always use shared instance
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
const queryClient = getSharedQueryClient();

// ❌ Don't create new instances
const queryClient = new QueryClient(); // Bad!
```

## 🐛 Troubleshooting

### Issue: Queries not sharing data between MFEs

**Solution**: Ensure you're using `getSharedQueryClient()` in all apps:

```typescript
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';
const queryClient = getSharedQueryClient();
```

### Issue: Cache not updating after mutation

**Solution**: Invalidate queries in `onSuccess`:

```typescript
const mutation = useMutation({
  mutationFn: updateFn,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey });
  },
});
```

### Issue: Too many refetches

**Solution**: Increase `staleTime`:

```typescript
useQuery({
  queryKey,
  queryFn,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Issue: Can't see queries in DevTools

**Solution**: Ensure DevTools are added to shell apps:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Issue: TypeScript errors with query keys

**Solution**: Use the query key factory:

```typescript
import { queryKeys } from '@hs-mono-repo/shared-api-client';
const key = queryKeys.profile.byUserId(userId); // Type-safe!
```

## 📚 Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Module Federation Integration Guide](./MODULE_FEDERATION_SETUP.md)
- [API Client Reference](./libs/shared/api-client/README.md)

---

**Questions?** Check the troubleshooting section or ask the team!
