# React Query Setup Complete! ✅

The React Query integration is now complete. Follow these steps to start using it:

## 🚀 Quick Start

### 1. Restart All Dev Servers

**IMPORTANT**: The TypeScript path mappings were updated in `tsconfig.base.json`. You need to restart any running dev servers for the changes to take effect.

```bash
# Stop any running servers (Ctrl+C)

# Then start all services:
npm run start
```

Or start individually:
```bash
npm run start:profile    # Port 4203
npm run start:summary    # Port 4204
npm run start:web-cl     # Port 4202
npm run start:web-hs     # Port 4201
```

### 2. Verify Installation

Check that the shared API client is properly imported:

```bash
# TypeScript check (should have no errors)
npx tsc --noEmit --project apps/web-cl/tsconfig.app.json
```

### 3. Open Applications

Once servers are running:

- **Web CL Shell**: http://localhost:4202
- **Web HS Shell**: http://localhost:4201
- **Profile MFE (Standalone)**: http://localhost:4203
- **Summary MFE (Standalone)**: http://localhost:4204

## 🎯 What Was Configured

### ✅ TypeScript Path Mapping

Added to `tsconfig.base.json`:
```json
{
  "paths": {
    "@hs-mono-repo/shared-api-client": ["libs/shared/api-client/src/index.ts"]
  }
}
```

### ✅ Shared API Client Library

Created at `libs/shared/api-client/` with:
- API client functions
- TypeScript types
- Query key factory
- QueryClient configuration

### ✅ Module Federation

Configured `@tanstack/react-query` as **singleton** in:
- `apps/mfe-profile/vite.config.ts`
- `apps/mfe-summary/vite.config.ts`
- `apps/web-cl/vite.config.ts`
- `apps/web-hs/vite.config.ts`

### ✅ QueryClient Providers

Added to all applications:
- Shell apps: `apps/web-cl/src/main.tsx` and `apps/web-hs/src/main.tsx`
- MFEs: Wrapped in components for standalone usage

### ✅ Custom Hooks

Created:
- `apps/mfe-profile/src/hooks/useProfile.ts`
- `apps/mfe-summary/src/hooks/useSummary.ts`

### ✅ Components Refactored

Both MFEs now use React Query:
- `apps/mfe-profile/src/components/ProfilePage.tsx`
- `apps/mfe-summary/src/components/SummaryPage.tsx`

## 📚 Documentation

Comprehensive guides created:
- **[REACT_QUERY_INTEGRATION.md](./REACT_QUERY_INTEGRATION.md)** - Complete integration guide
- **[libs/shared/api-client/README.md](./libs/shared/api-client/README.md)** - API client reference

## 🛠 Usage Example

```typescript
import { useQuery } from '@tanstack/react-query';
import { profileApi, queryKeys } from '@hs-mono-repo/shared-api-client';

function MyComponent({ userId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.profile.byUserId(userId),
    queryFn: () => profileApi.getProfile(userId),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Welcome, {data.name}!</div>;
}
```

## 🐛 Troubleshooting

### Error: "Failed to resolve import @hs-mono-repo/shared-api-client"

**Solution**: Restart the Vite dev server.

```bash
# Stop the server (Ctrl+C)
# Then start again
npm run start:web-cl
```

### TypeScript Errors

If you see TypeScript errors about the import:

```bash
# Clear Nx cache
nx reset

# Restart TypeScript server in your IDE
# VSCode: Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### React Query DevTools Not Showing

DevTools are only shown in shell applications (web-cl, web-hs). They appear as a React Query icon in the bottom-left corner when running in development mode.

## 🎉 Next Steps

1. **Start the dev servers** (see step 1 above)
2. **Open the browser** to http://localhost:4202
3. **Open React Query DevTools** (bottom-left icon)
4. **Navigate to Profile or Summary pages** to see queries in action
5. **Edit data** to see optimistic updates and cache invalidation

## 📖 Learn More

- Read the [Integration Guide](./REACT_QUERY_INTEGRATION.md) for detailed examples
- Check the [API Client README](./libs/shared/api-client/README.md) for API reference
- Explore [TanStack Query Docs](https://tanstack.com/query/latest) for advanced features

---

**All set!** 🚀 Start your dev servers and begin using React Query in your micro-frontends!
