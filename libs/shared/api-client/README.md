# Shared API Client

Centralized API client library for the HS Mono Repo micro-frontends architecture, built with TypeScript and integrated with TanStack React Query.

## Overview

This library provides:
- **Type-safe API clients** for BFF communication
- **Query key factory** for consistent caching
- **QueryClient configuration** optimized for micro-frontends
- **TypeScript types** for all API requests/responses

## Installation

The library is already configured in the Nx workspace. Import it in any app:

```typescript
import {
  apiClient,
  queryKeys,
  getSharedQueryClient,
  type ProfileData,
  type SummaryData,
} from '@hs-mono-repo/shared-api-client';
```

## API Client

### Profile API

```typescript
import { profileApi } from '@hs-mono-repo/shared-api-client';

// Get profile
const profile = await profileApi.getProfile('user-123');

// Update profile
const updated = await profileApi.updateProfile('user-123', {
  name: 'John Doe',
  bio: 'Software Engineer',
});

// Upload avatar
const result = await profileApi.uploadAvatar('user-123', file);
```

### Summary API

```typescript
import { summaryApi } from '@hs-mono-repo/shared-api-client';

// Get summary
const summary = await summaryApi.getSummary({
  userId: 'user-123',
  timeRange: 'month',
  limit: 10,
});

// Refresh summary
const refreshed = await summaryApi.refreshSummary('user-123');
```

## Query Keys

Use the query key factory for consistent caching:

```typescript
import { queryKeys } from '@hs-mono-repo/shared-api-client';

// Profile keys
queryKeys.profile.all                  // ['profile']
queryKeys.profile.byUserId('user-123') // ['profile', 'user-123']
queryKeys.profile.avatar('user-123')   // ['profile', 'user-123', 'avatar']

// Summary keys
queryKeys.summary.all                  // ['summary']
queryKeys.summary.byUserId('user-123') // ['summary', 'user-123']
queryKeys.summary.filtered('user-123', { timeRange: 'month' })
// ['summary', 'user-123', { timeRange: 'month' }]
```

## QueryClient

Get the shared QueryClient instance:

```typescript
import { getSharedQueryClient } from '@hs-mono-repo/shared-api-client';

const queryClient = getSharedQueryClient();
```

This ensures all micro-frontends share the same cache.

## Usage in Components

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileApi, queryKeys } from '@hs-mono-repo/shared-api-client';

function ProfileComponent({ userId }) {
  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.profile.byUserId(userId),
    queryFn: () => profileApi.getProfile(userId),
  });

  // Update data
  const mutation = useMutation({
    mutationFn: (newData) => profileApi.updateProfile(userId, newData),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{data.name}</div>;
}
```

## Types

All API types are exported:

```typescript
import type {
  ProfileData,
  UpdateProfileRequest,
  SummaryData,
  SummaryQueryParams,
  ApiError,
  MetricData,
  ActivityItem,
} from '@hs-mono-repo/shared-api-client';
```

## Development

### Build

```bash
nx build shared-api-client
```

### Test

```bash
nx test shared-api-client
```

### Lint

```bash
nx lint shared-api-client
```

## Configuration

API base URL is configured via environment variables:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080

# .env.production
VITE_API_BASE_URL=https://api.example.com
```

## Documentation

See [REACT_QUERY_INTEGRATION.md](../../../REACT_QUERY_INTEGRATION.md) for complete integration guide.
