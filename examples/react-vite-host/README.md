# React + Vite Host Application Example

Example host application demonstrating MFE integration using React, Vite, and Module Federation.

## Features

- Module Federation with @module-federation/vite
- Lazy loading of MFE components
- Error boundaries for graceful error handling
- Loading states with Suspense
- Shared dependencies (React, React Query, React Router)

## Prerequisites

- Node.js 18+
- npm or yarn
- Access to MFE CDN

## Installation

```bash
npm install
```

## Configuration

Update the CDN URLs in `vite.config.ts` if needed:

```typescript
remotes: {
  mfe_profile: {
    entry: 'https://your-cdn-url.com/mfe-profile/latest/remoteEntry.js',
  },
}
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build

```bash
npm run build
```

## Project Structure

```
react-vite-host/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   └── App.css           # Styles
├── vite.config.ts        # Vite + Module Federation config
├── package.json
└── README.md
```

## MFE Integration

### Loading MFE Components

```tsx
import { lazy } from 'react';

const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));
```

### Error Handling

```tsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<LoadingSpinner />}>
    <ProfilePage />
  </Suspense>
</ErrorBoundary>
```

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure:
1. CDN URL is correct
2. Your domain is whitelisted
3. Browser allows cross-origin module scripts

### Module Not Found

Check:
1. MFE name uses underscore (mfe_profile, not mfe-profile)
2. Module path is correct (./ProfilePage)
3. Network tab shows successful remoteEntry.js load

### Version Conflicts

Ensure shared dependencies match:
- React: ^19.0.0
- React DOM: ^19.0.0
- React Query: ^5.0.0

## Learn More

- [Module Federation Docs](https://module-federation.io/)
- [Vite Docs](https://vitejs.dev/)
- [MFE Consumer Guide](../../docs/MFE_CONSUMER_GUIDE.md)
