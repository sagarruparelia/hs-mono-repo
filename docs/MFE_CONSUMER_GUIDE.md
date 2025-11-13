# Micro-Frontend (MFE) Consumer Integration Guide

Complete guide for integrating our MFEs into external applications.

## Table of Contents

- [Overview](#overview)
- [Available MFEs](#available-mfes)
- [Quick Start](#quick-start)
- [Integration Methods](#integration-methods)
- [Version Management](#version-management)
- [TypeScript Support](#typescript-support)
- [Security](#security)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

---

## Overview

Our MFEs are deployed using **Module Federation** and exposed through multiple integration methods to support various consumer scenarios:

1. **Module Federation (React + Vite)** - For React apps using Vite
2. **Module Federation (React + Webpack)** - For React apps using Webpack
3. **Web Components** - Framework-agnostic custom elements
4. **Dynamic Script Loading** - Runtime loading without build configuration

### Architecture

```
┌─────────────────┐
│   Host App      │
│  (Consumer)     │
└────────┬────────┘
         │
         │ Loads via CDN
         ▼
┌─────────────────────────────────┐
│      CDN (CloudFront/S3)        │
│  https://cdn.example.com/       │
├─────────────────────────────────┤
│  /mfe-profile/                  │
│    ├── v1.0.0/                  │
│    │   ├── remoteEntry.js       │
│    │   ├── manifest.json        │
│    │   ├── types.d.ts           │
│    │   └── assets/              │
│    └── latest/ → v1.0.0         │
├─────────────────────────────────┤
│  /mfe-summary/                  │
│    ├── v1.0.0/                  │
│    └── latest/ → v1.0.0         │
└─────────────────────────────────┘
```

---

## Available MFEs

### 1. mfe-profile

User profile management functionality.

**Exposed Modules:**
- `./ProfilePage` - Standalone profile component
- `./ProfilePageWithRouter` - Profile with TanStack Router
- `./bootstrap` - Full app bootstrap
- `./customElement` - Web Component

**CDN URLs:**
- Remote Entry: `https://cdn.example.com/mfe-profile/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-profile/latest/manifest.json`

### 2. mfe-summary

Summary and dashboard functionality.

**Exposed Modules:**
- `./SummaryPage` - Standalone summary component
- `./SummaryPageWithRouter` - Summary with TanStack Router
- `./bootstrap` - Full app bootstrap
- `./customElement` - Web Component

**CDN URLs:**
- Remote Entry: `https://cdn.example.com/mfe-summary/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-summary/latest/manifest.json`

### 3. mfe-documents

Document management functionality.

**Exposed Modules:**
- `./DocumentsPage` - Standalone documents component
- `./bootstrap` - Full app bootstrap

**CDN URLs:**
- Remote Entry: `https://cdn.example.com/mfe-documents/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-documents/latest/manifest.json`

---

## Quick Start

### Prerequisites

- Node.js 18+ (for React-based integrations)
- Modern browser with ES modules support
- Access to CDN (contact support for whitelisting if needed)

### 1. Fetch MFE Manifest

```bash
curl https://cdn.example.com/mfe-profile/latest/manifest.json
```

Response:
```json
{
  "name": "mfe_profile",
  "version": "1.0.0",
  "remoteEntry": "https://cdn.example.com/mfe-profile/1.0.0/remoteEntry.js",
  "exposedModules": {
    "ProfilePage": {
      "path": "./ProfilePage",
      "description": "Standalone profile page component",
      "type": "component"
    }
  },
  "shared": ["react", "react-dom", "@tanstack/react-query"],
  "environment": "production",
  "deployedAt": "2025-01-15T10:30:00Z"
}
```

---

## Integration Methods

### Method 1: Module Federation with Vite (Recommended for React)

Best for modern React applications using Vite.

#### Installation

```bash
npm install @module-federation/vite
```

#### Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'host_app',
      remotes: {
        mfe_profile: {
          type: 'module',
          name: 'mfe_profile',
          entry: 'https://cdn.example.com/mfe-profile/latest/remoteEntry.js',
          entryGlobalName: 'mfe_profile',
          shareScope: 'default',
        },
        mfe_summary: {
          type: 'module',
          name: 'mfe_summary',
          entry: 'https://cdn.example.com/mfe-summary/latest/remoteEntry.js',
          entryGlobalName: 'mfe_summary',
          shareScope: 'default',
        },
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
        },
        '@tanstack/react-router': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
      },
    }),
    react(),
  ],
});
```

#### Usage in Components

```tsx
// App.tsx
import { lazy, Suspense } from 'react';

// Lazy load MFE components
const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));
const SummaryPage = lazy(() => import('mfe_summary/SummaryPage'));

function App() {
  return (
    <div className="app">
      <nav>
        <h1>My Application</h1>
      </nav>

      <main>
        <Suspense fallback={<LoadingSpinner />}>
          {/* Render MFE components */}
          <ProfilePage />
          <SummaryPage />
        </Suspense>
      </main>
    </div>
  );
}

export default App;
```

#### Error Handling

```tsx
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const ProfilePage = lazy(() =>
  import('mfe_profile/ProfilePage').catch(error => {
    console.error('Failed to load ProfilePage:', error);
    // Fallback component
    return { default: () => <div>Failed to load profile</div> };
  })
);

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<LoadingSpinner />}>
        <ProfilePage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Method 2: Module Federation with Webpack

Best for existing React applications using Webpack.

#### Installation

```bash
npm install webpack@5
```

#### Configuration

```javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  // ... other webpack config
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        mfe_profile: 'mfe_profile@https://cdn.example.com/mfe-profile/latest/remoteEntry.js',
        mfe_summary: 'mfe_summary@https://cdn.example.com/mfe-summary/latest/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
      },
    }),
  ],
};
```

#### Usage

Same as Vite - use lazy loading with React.lazy().

---

### Method 3: Web Components (Framework Agnostic)

Best for non-React applications or when you need framework independence.

#### Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MFE Integration</title>
</head>
<body>
  <h1>My Application</h1>

  <!-- MFE custom elements -->
  <mfe-profile-component></mfe-profile-component>
  <mfe-summary-component></mfe-summary-component>

  <script type="module">
    // Load and register custom elements
    Promise.all([
      import('https://cdn.example.com/mfe-profile/latest/customElement.js'),
      import('https://cdn.example.com/mfe-summary/latest/customElement.js'),
    ]).then(([profileModule, summaryModule]) => {
      profileModule.register();
      summaryModule.register();
      console.log('MFEs loaded successfully');
    }).catch(error => {
      console.error('Failed to load MFEs:', error);
    });
  </script>
</body>
</html>
```

#### Angular Integration

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1>Angular Host App</h1>
    <mfe-profile-component></mfe-profile-component>
  `
})
export class AppComponent implements OnInit {
  async ngOnInit() {
    // Load MFE custom element
    const module = await import('https://cdn.example.com/mfe-profile/latest/customElement.js');
    module.register();
  }
}
```

#### Vue Integration

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <h1>Vue Host App</h1>
    <mfe-profile-component></mfe-profile-component>
  </div>
</template>

<script>
export default {
  name: 'App',
  async mounted() {
    const module = await import('https://cdn.example.com/mfe-profile/latest/customElement.js');
    module.register();
  }
}
</script>
```

---

### Method 4: Dynamic Script Loading

Best for runtime loading without build-time configuration.

#### Utility Function

```typescript
// mfe-loader.ts
export interface MFEContainer {
  get: (module: string) => Promise<() => any>;
  init: (shareScope: any) => Promise<void>;
}

export async function loadMFE(
  mfeName: string,
  version: string = 'latest'
): Promise<MFEContainer> {
  const cdnUrl = 'https://cdn.example.com';
  const scriptUrl = `${cdnUrl}/${mfeName}/${version}/remoteEntry.js`;

  return new Promise((resolve, reject) => {
    // Check if already loaded
    const globalName = mfeName.replace(/-/g, '_');
    if (window[globalName]) {
      resolve(window[globalName]);
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'module';

    script.onload = () => {
      const container = window[globalName] as MFEContainer;
      if (container) {
        resolve(container);
      } else {
        reject(new Error(`Container ${globalName} not found`));
      }
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${scriptUrl}`));
    };

    document.head.appendChild(script);
  });
}

export async function loadMFEModule<T = any>(
  mfeName: string,
  moduleName: string,
  version: string = 'latest'
): Promise<T> {
  const container = await loadMFE(mfeName, version);

  // Initialize container
  if (typeof __webpack_init_sharing__ !== 'undefined') {
    await __webpack_init_sharing__('default');
    await container.init(__webpack_share_scopes__.default);
  }

  // Get module factory
  const factory = await container.get(moduleName);
  const module = factory();

  return module;
}
```

#### Usage Example

```typescript
// App.tsx
import { useEffect, useState } from 'react';
import { loadMFEModule } from './mfe-loader';

function App() {
  const [ProfileComponent, setProfileComponent] = useState<any>(null);

  useEffect(() => {
    loadMFEModule('mfe-profile', './ProfilePage', '1.0.0')
      .then(module => {
        setProfileComponent(() => module.default);
      })
      .catch(error => {
        console.error('Failed to load MFE:', error);
      });
  }, []);

  return (
    <div>
      {ProfileComponent ? <ProfileComponent /> : <div>Loading...</div>}
    </div>
  );
}
```

---

## Version Management

### Semantic Versioning

All MFEs follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Version Strategies

#### 1. Latest (Automatic Updates)

Always use the most recent version:

```typescript
entry: 'https://cdn.example.com/mfe-profile/latest/remoteEntry.js'
```

**Pros:** Automatic updates, always newest features
**Cons:** Potential breaking changes

#### 2. Pinned Version (Stable)

Lock to a specific version:

```typescript
entry: 'https://cdn.example.com/mfe-profile/v1.2.3/remoteEntry.js'
```

**Pros:** Guaranteed stability, predictable behavior
**Cons:** Manual updates required

#### 3. Dynamic Version Selection

Programmatically choose versions:

```typescript
async function getMFEVersion(mfeName: string, versionRange: string) {
  // Fetch manifest
  const manifest = await fetch(
    `https://cdn.example.com/${mfeName}/latest/manifest.json`
  ).then(res => res.json());

  // Check if version satisfies range
  const currentVersion = manifest.version;
  if (satisfiesRange(currentVersion, versionRange)) {
    return currentVersion;
  }

  // Fallback to latest
  return 'latest';
}

// Usage
const version = await getMFEVersion('mfe-profile', '^1.0.0');
loadMFE('mfe-profile', version);
```

### Version Compatibility Matrix

| Host React Version | MFE Version | Compatible |
|-------------------|-------------|------------|
| ^19.0.0           | 1.x.x       | ✅ Yes     |
| ^18.0.0           | 1.x.x       | ⚠️ Partial |
| <18.0.0           | 1.x.x       | ❌ No      |

---

## TypeScript Support

### Installing Type Definitions

#### Option 1: Download from CDN

```bash
curl -o src/types/mfe-profile.d.ts https://cdn.example.com/mfe-profile/latest/types.d.ts
```

#### Option 2: Reference in tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "mfe_profile/*": ["./src/types/mfe-profile"]
    }
  }
}
```

### Type Definition Example

```typescript
// src/types/mfe-profile.d.ts
declare module 'mfe_profile/ProfilePage' {
  import { FC } from 'react';
  const ProfilePage: FC;
  export default ProfilePage;
}

declare module 'mfe_profile/ProfilePageWithRouter' {
  import { FC } from 'react';
  const ProfilePageWithRouter: FC;
  export default ProfilePageWithRouter;
}
```

### Type-Safe Loading

```typescript
import type { FC } from 'react';

// Type-safe dynamic import
const ProfilePage = lazy<FC>(
  () => import('mfe_profile/ProfilePage')
);
```

---

## Security

### Content Security Policy (CSP)

Add these directives to your CSP headers:

```
Content-Security-Policy:
  script-src 'self' https://cdn.example.com;
  connect-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline' https://cdn.example.com;
  img-src 'self' https://cdn.example.com data:;
  font-src 'self' https://cdn.example.com;
```

### Subresource Integrity (SRI)

Verify MFE integrity before loading:

```typescript
async function loadMFEWithIntegrity(mfeName: string, version: string) {
  // Fetch manifest
  const manifest = await fetch(
    `https://cdn.example.com/${mfeName}/${version}/manifest.json`
  ).then(res => res.json());

  const expectedChecksum = manifest.checksum;

  // Fetch remoteEntry
  const response = await fetch(manifest.remoteEntry);
  const content = await response.text();

  // Calculate checksum
  const actualChecksum = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(content)
  );

  const actualChecksumHex = Array.from(new Uint8Array(actualChecksum))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (actualChecksumHex !== expectedChecksum) {
    throw new Error('Integrity check failed');
  }

  // Safe to load
  return loadScript(manifest.remoteEntry);
}
```

### CORS Configuration

All MFEs are served with proper CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Allow-Headers: Content-Type
```

For production, request domain-specific CORS configuration.

---

## Performance

### Caching Strategy

Our CDN uses optimized caching:

| Asset Type      | Cache Duration | Cache-Control Header                    |
|----------------|----------------|----------------------------------------|
| Static Assets  | 1 year         | `public, max-age=31536000, immutable`  |
| remoteEntry.js | 5 minutes      | `public, max-age=300, must-revalidate` |
| manifest.json  | No cache       | `no-cache, must-revalidate`            |

### Preloading

Preload MFEs for faster rendering:

```html
<link rel="modulepreload" href="https://cdn.example.com/mfe-profile/latest/remoteEntry.js">
```

```typescript
// Programmatic preload
const link = document.createElement('link');
link.rel = 'modulepreload';
link.href = 'https://cdn.example.com/mfe-profile/latest/remoteEntry.js';
document.head.appendChild(link);
```

### Code Splitting

MFEs are automatically code-split. Load only what you need:

```tsx
// Load specific components
const ProfileSettings = lazy(() =>
  import('mfe_profile/ProfileSettings')
);
```

### Bundle Size

| MFE          | Size (gzipped) |
|--------------|----------------|
| mfe-profile  | ~45 KB         |
| mfe-summary  | ~38 KB         |
| mfe-documents| ~52 KB         |

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Problem:** `Access to script blocked by CORS policy`

**Solutions:**
- Verify CDN URL is correct
- Check CSP headers
- Contact support to whitelist your domain

#### 2. Module Not Found

**Problem:** `Error: Cannot find module 'mfe_profile/ProfilePage'`

**Solutions:**
- Check module name spelling (use underscore, not dash)
- Verify MFE version exists
- Check network tab for 404 errors

#### 3. Version Conflicts

**Problem:** `Shared module version mismatch`

**Solutions:**
- Ensure React versions match (use singleton: true)
- Check all shared dependencies versions
- Consider using eager loading for critical deps

#### 4. Loading Timeout

**Problem:** MFE takes too long to load

**Solutions:**
- Check network connectivity
- Verify CDN is accessible
- Use preloading
- Implement loading timeout

```typescript
function loadWithTimeout(url: string, timeout: number = 10000) {
  return Promise.race([
    loadMFE(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

#### 5. Runtime Errors

**Problem:** MFE loads but crashes at runtime

**Solutions:**
- Check browser console for errors
- Verify all required shared deps are provided
- Use Error Boundaries
- Check props/context compatibility

### Debug Mode

Enable debug logging:

```typescript
// Enable MFE debug mode
window.__MFE_DEBUG__ = true;

// Load MFE with verbose logging
loadMFE('mfe-profile', 'latest').catch(error => {
  console.error('MFE Load Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
});
```

---

## Examples

### Complete React + Vite Example

See: [`examples/react-vite-host/`](../examples/react-vite-host/)

### Complete Webpack Example

See: [`examples/react-webpack-host/`](../examples/react-webpack-host/)

### Vanilla JS Example

See: [`examples/vanilla-js-host/`](../examples/vanilla-js-host/)

### Next.js Example

See: [`examples/nextjs-host/`](../examples/nextjs-host/)

---

## Support

- **Documentation:** This guide
- **API Reference:** Check manifest.json for each MFE
- **Issues:** Open a GitHub issue
- **Email:** support@example.com

---

## Changelog

### v1.0.0 (2025-01-13)
- Initial release
- Module Federation support (Vite & Webpack)
- Web Components support
- TypeScript definitions
- Comprehensive documentation

---

*Last updated: 2025-01-13*
