# MFE Local Development Guide

Complete guide for developing and testing MFE custom components locally in your monorepo.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Scenarios](#development-scenarios)
3. [Running Individual MFEs](#running-individual-mfes)
4. [Testing Custom Elements](#testing-custom-elements)
5. [Integration with Host Apps](#integration-with-host-apps)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## Quick Start

### Option 1: Start Everything (Recommended for Full Testing)

```bash
# Start all MFEs and host apps simultaneously
npm start

# This runs: mfe-profile, mfe-summary, web-cl, web-hs in parallel
```

**Access Points:**
- MFE Profile: http://localhost:4203
- MFE Summary: http://localhost:4204
- web-cl (Host): http://localhost:4202
- web-hs (Host): http://localhost:4201

### Option 2: Start Only MFEs

```bash
# Start all MFEs (without host apps)
npm run start:mfe

# This runs: mfe-profile, mfe-summary in parallel
```

### Option 3: Start Individual MFE

```bash
# Start mfe-profile only
npm run start:profile

# Or use nx directly
nx serve mfe-profile
```

---

## Development Scenarios

### Scenario 1: Developing MFE in Isolation

When you want to work on an MFE without host apps.

```bash
# Terminal 1: Start the MFE
npm run start:profile

# Opens: http://localhost:4203
```

**What you get:**
- Standalone MFE running on port 4203
- Hot reload on file changes
- Independent development environment
- Access to all exposed modules

**Exposed Modules (mfe-profile):**
- `/ProfilePage` - Single page component
- `/ProfilePageWithRouter` - Component with internal routing
- `/bootstrap` - Bootstrap entry point
- `/customElement` - Web Component wrapper

### Scenario 2: Developing MFE with Host App

Test your MFE within a host application (realistic production scenario).

```bash
# Terminal 1: Start the MFE
npm run start:profile

# Terminal 2: Start the host app
npm run start:web-cl

# Opens: http://localhost:4202
```

**Module Federation Flow:**
1. web-cl (host) runs on port 4202
2. Host loads MFE from http://localhost:4203/remoteEntry.js
3. MFE dynamically imported when route is accessed
4. Shared dependencies (React, React Router) deduped

### Scenario 3: Full Stack Development

Test entire system including backend.

```bash
# Terminal 1: Start all frontend apps
npm start

# Terminal 2: Start BFF (Spring Boot backend)
npm run start:bff

# Or run BFF directly with Maven
cd apps/bff
mvn spring-boot:run
```

**Complete Setup:**
- MFEs: http://localhost:4203, 4204
- Host apps: http://localhost:4201, 4202
- BFF API: http://localhost:8080

---

## Running Individual MFEs

### MFE Profile (Port 4203)

```bash
# Development mode with hot reload
npm run start:profile

# Build for production
npm run build:profile

# Run tests
npm run test:profile

# Run tests in watch mode
nx test mfe-profile --watch

# Type checking
npm run typecheck:profile

# Linting
npm run lint:profile
```

**Configuration:**
- Port: 4203 (apps/mfe-profile/vite.config.ts:12)
- Federation name: `mfe_profile`
- Remote entry: http://localhost:4203/remoteEntry.js

**Exposed Components:**
```typescript
// Import in host app
import ProfilePage from 'mfe_profile/ProfilePage';
import ProfilePageWithRouter from 'mfe_profile/ProfilePageWithRouter';
import customElement from 'mfe_profile/customElement';
```

### MFE Summary (Port 4204)

```bash
# Development mode
npm run start:summary

# Build
npm run build:summary

# Test
npm run test:summary
```

### MFE Documents (Port 4205)

```bash
# Development mode
nx serve mfe-documents

# Build
nx build mfe-documents
```

---

## Testing Custom Elements (Web Components)

Your MFEs expose **Web Components** that can be used in any framework or vanilla HTML.

### Custom Element: `<mfe-profile>`

**Location:** apps/mfe-profile/src/ce.tsx

**Attributes:**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `theme` | `'light' \| 'dark'` | `'light'` | Theme mode |
| `user-id-type` | `string` | `'EID'` | User ID type (EID, HSID, etc.) |
| `user-id-value` | `string` | - | User ID value |
| `logged-in-user-id-type` | `string` | - | Logged-in user ID type |
| `logged-in-user-id-value` | `string` | - | Logged-in user ID value |
| `route` | `string` | `'/'` | Initial route (enables router) |
| `use-router` | `boolean` | `false` | Enable internal routing |
| `user-id` | `string` | - | (Legacy) User ID |

**Events:**

| Event | Detail | Description |
|-------|--------|-------------|
| `profile-update` | `{ name, email, bio, avatar }` | Fired when profile is updated |
| `route-change` | `{ route, from }` | Fired when internal route changes |

### Test Custom Element in Standalone HTML

Create a test HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MFE Custom Element Test</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 2rem;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>MFE Profile - Custom Element Test</h1>

    <!-- Custom Element -->
    <mfe-profile
      theme="light"
      user-id-type="EID"
      user-id-value="12345"
      use-router="true"
      route="/"
    ></mfe-profile>
  </div>

  <!-- Load the MFE custom element -->
  <script type="module" src="http://localhost:4203/customElement"></script>

  <script>
    // Listen to events
    const profileElement = document.querySelector('mfe-profile');

    profileElement.addEventListener('profile-update', (event) => {
      console.log('Profile updated:', event.detail);
    });

    profileElement.addEventListener('route-change', (event) => {
      console.log('Route changed:', event.detail);
    });

    // Programmatically change attributes
    setTimeout(() => {
      profileElement.setAttribute('theme', 'dark');
    }, 5000);
  </script>
</body>
</html>
```

**Steps:**

1. **Start MFE:**
   ```bash
   npm run start:profile
   ```

2. **Create test file:**
   ```bash
   # In project root
   cat > test-custom-element.html << 'EOF'
   [paste HTML above]
   EOF
   ```

3. **Serve the HTML file:**
   ```bash
   # Option 1: Use npx serve
   npx serve .

   # Option 2: Use Python
   python3 -m http.server 8000

   # Option 3: Use PHP
   php -S localhost:8000
   ```

4. **Open in browser:**
   http://localhost:8000/test-custom-element.html

### Test Custom Element with Different Frameworks

#### React Host App

```tsx
import { useEffect, useRef } from 'react';

function App() {
  const profileRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Load the custom element script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'http://localhost:4203/customElement';
    document.body.appendChild(script);

    // Listen to events
    const handleUpdate = (e: Event) => {
      console.log('Profile updated:', (e as CustomEvent).detail);
    };

    const element = profileRef.current;
    element?.addEventListener('profile-update', handleUpdate);

    return () => {
      element?.removeEventListener('profile-update', handleUpdate);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>
      <h1>React App with MFE Custom Element</h1>
      <mfe-profile
        ref={profileRef}
        theme="light"
        user-id-value="12345"
        use-router="true"
      />
    </div>
  );
}
```

#### Angular Host App

```typescript
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div>
      <h1>Angular App with MFE Custom Element</h1>
      <mfe-profile
        #profile
        theme="light"
        user-id-value="12345"
        use-router="true"
      ></mfe-profile>
    </div>
  `
})
export class AppComponent implements OnInit {
  @ViewChild('profile') profileElement!: ElementRef;

  ngOnInit() {
    // Load custom element script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'http://localhost:4203/customElement';
    document.body.appendChild(script);
  }

  ngAfterViewInit() {
    // Listen to events
    this.profileElement.nativeElement.addEventListener('profile-update', (e: CustomEvent) => {
      console.log('Profile updated:', e.detail);
    });
  }
}
```

#### Vue Host App

```vue
<template>
  <div>
    <h1>Vue App with MFE Custom Element</h1>
    <mfe-profile
      ref="profile"
      theme="light"
      user-id-value="12345"
      use-router="true"
      @profile-update="handleProfileUpdate"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const profile = ref(null);

onMounted(() => {
  // Load custom element script
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'http://localhost:4203/customElement';
  document.body.appendChild(script);
});

const handleProfileUpdate = (event) => {
  console.log('Profile updated:', event.detail);
};
</script>
```

---

## Integration with Host Apps

### web-cl Configuration

**File:** apps/web-cl/vite.config.ts

```typescript
federation({
  name: 'web_cl',
  remotes: {
    mfe_profile: {
      type: 'module',
      name: 'mfe_profile',
      entry: 'http://localhost:4203/remoteEntry.js',
      entryGlobalName: 'mfe_profile',
      shareScope: 'default',
    },
    mfe_summary: {
      type: 'module',
      name: 'mfe_summary',
      entry: 'http://localhost:4204/remoteEntry.js',
      entryGlobalName: 'mfe_summary',
      shareScope: 'default',
    },
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    '@tanstack/react-query': { singleton: true },
  },
})
```

### Using MFE in Host App (Module Federation)

```tsx
// apps/web-cl/src/app/app.tsx
import { lazy, Suspense } from 'react';

// Lazy load MFE component
const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));

function App() {
  return (
    <div>
      <h1>web-cl Host Application</h1>

      <Suspense fallback={<div>Loading Profile...</div>}>
        <ProfilePage
          userId="demo-user"
          theme="light"
          onUpdate={(data) => console.log('Updated:', data)}
        />
      </Suspense>
    </div>
  );
}

export default App;
```

### TypeScript Support

To get TypeScript support for MFE imports, create declaration files:

```typescript
// apps/web-cl/src/mfe-types.d.ts

declare module 'mfe_profile/ProfilePage' {
  import { ComponentType } from 'react';

  export interface ProfilePageProps {
    userId?: string;
    theme?: 'light' | 'dark';
    onUpdate?: (data: any) => void;
  }

  const ProfilePage: ComponentType<ProfilePageProps>;
  export default ProfilePage;
}

declare module 'mfe_profile/ProfilePageWithRouter' {
  import { ComponentType } from 'react';

  export interface ProfilePageWithRouterProps {
    theme?: 'light' | 'dark';
    userIdType?: string;
    userIdValue?: string;
    loggedInUserIdType?: string;
    loggedInUserIdValue?: string;
    route?: string;
    onUpdate?: (data: any) => void;
    onRouteChange?: (newRoute: string) => void;
  }

  const ProfilePageWithRouter: ComponentType<ProfilePageWithRouterProps>;
  export default ProfilePageWithRouter;
}
```

---

## Troubleshooting

### Issue: MFE Not Loading in Host App

**Symptoms:**
- Host app shows error: "Cannot find module 'mfe_profile/ProfilePage'"
- Browser console: "Failed to fetch remoteEntry.js"

**Solution:**

1. **Ensure MFE is running:**
   ```bash
   # Check if MFE is running
   curl http://localhost:4203/remoteEntry.js

   # Should return JavaScript code, not 404
   ```

2. **Check ports match:**
   - MFE Profile: 4203
   - Host app config: Should point to 4203

3. **Verify CORS (if needed):**
   ```typescript
   // vite.config.ts
   server: {
     cors: true,
     headers: {
       'Access-Control-Allow-Origin': '*',
     }
   }
   ```

4. **Clear cache and restart:**
   ```bash
   npm run clean
   npm install
   npm run start:profile
   ```

### Issue: Shared Dependencies Conflict

**Symptoms:**
- Multiple React instances
- React hooks errors
- Context not working

**Solution:**

Ensure shared dependencies are configured as singletons:

```typescript
// Both MFE and Host vite.config.ts
shared: {
  react: {
    singleton: true,
    requiredVersion: '^19.0.0',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^19.0.0',
  },
}
```

### Issue: Hot Reload Not Working

**Solution:**

1. **Check Vite dev server:**
   ```bash
   # Should see: "VITE v5.x.x ready in X ms"
   ```

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run start:profile
   ```

3. **Check file watchers:**
   ```bash
   # macOS/Linux - increase limit
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

### Issue: Custom Element Not Registering

**Symptoms:**
- `<mfe-profile>` renders as unknown element
- No error in console

**Solution:**

1. **Verify script import:**
   ```html
   <!-- Correct -->
   <script type="module" src="http://localhost:4203/customElement"></script>

   <!-- Wrong (missing type="module") -->
   <script src="http://localhost:4203/customElement"></script>
   ```

2. **Check browser console:**
   ```javascript
   // Should return true
   console.log(customElements.get('mfe-profile'));
   ```

3. **Verify MFE is exposing custom element:**
   ```typescript
   // apps/mfe-profile/vite.config.ts
   exposes: {
     './customElement': './src/ce.tsx',  // ✓ Correct
   }
   ```

### Issue: API Calls Failing (CORS)

**Symptoms:**
- Network errors in browser console
- CORS policy errors

**Solution:**

1. **Start BFF with CORS enabled:**
   ```yaml
   # apps/bff/src/main/resources/application.yml
   spring:
     webflux:
       cors:
         allowed-origins: "http://localhost:4203,http://localhost:4202"
         allowed-methods: "*"
   ```

2. **Or use Vite proxy:**
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': {
         target: 'http://localhost:8080',
         changeOrigin: true,
       }
     }
   }
   ```

---

## Advanced Usage

### Environment Variables

Configure different environments:

```bash
# Development (local)
VITE_API_URL=http://localhost:8080
VITE_CDN_URL=http://localhost:4203

# Staging
VITE_API_URL=https://staging-api.example.com
VITE_CDN_URL=https://staging-cdn.example.com

# Production
VITE_API_URL=https://api.example.com
VITE_CDN_URL=https://cdn.example.com
```

**Usage in code:**
```typescript
const API_URL = import.meta.env.VITE_API_URL;
const CDN_URL = import.meta.env.VITE_CDN_URL;
```

### Debugging Module Federation

Enable verbose logging:

```typescript
// vite.config.ts
federation({
  name: 'mfe_profile',
  // ... other config
  dev: {
    disableViteServer: false,
    // Enable debug logs
  },
})
```

**Chrome DevTools:**

1. Open DevTools → Network tab
2. Filter: `remoteEntry.js`
3. Check if remote is loaded
4. Inspect loaded modules in Sources tab

### Performance Optimization

**Code Splitting:**
```typescript
// Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

**Shared Dependency Optimization:**
```typescript
shared: {
  react: {
    singleton: true,
    eager: true,  // Load immediately
    requiredVersion: '^19.0.0',
  },
}
```

**Build Analysis:**
```bash
# Analyze bundle size
npm run build:profile
npx vite-bundle-visualizer dist/apps/mfe-profile
```

### Testing Strategy

**Unit Tests:**
```bash
# Run all tests
npm run test:profile

# Watch mode
nx test mfe-profile --watch

# Coverage
nx test mfe-profile --coverage
```

**E2E Tests with Playwright:**
```typescript
// tests/mfe-profile.spec.ts
import { test, expect } from '@playwright/test';

test('MFE loads and displays profile', async ({ page }) => {
  // Navigate to standalone MFE
  await page.goto('http://localhost:4203');

  // Wait for profile to load
  await expect(page.locator('.profile-page')).toBeVisible();

  // Check profile data
  await expect(page.locator('h2')).toContainText('John Doe');
});

test('MFE loads in host app', async ({ page }) => {
  // Navigate to host app
  await page.goto('http://localhost:4202/profile');

  // MFE should be loaded via Module Federation
  await expect(page.locator('.profile-page')).toBeVisible();
});
```

---

## Quick Reference

### NPM Scripts

```bash
# Start all apps
npm start                       # All MFEs + Hosts
npm run start:mfe              # All MFEs only
npm run start:shells           # All Hosts only

# Individual apps
npm run start:profile          # MFE Profile (4203)
npm run start:summary          # MFE Summary (4204)
npm run start:web-cl           # Host web-cl (4202)
npm run start:web-hs           # Host web-hs (4201)
npm run start:bff              # BFF Backend (8080)

# Build
npm run build:profile          # Build MFE Profile
npm run build:web-cl           # Build Host web-cl

# Test
npm run test:profile           # Test MFE Profile
npm run test:coverage          # Test all with coverage

# Lint & Type Check
npm run lint:profile           # Lint MFE Profile
npm run typecheck:profile      # Type check MFE Profile
```

### Ports Reference

| App | Port | URL |
|-----|------|-----|
| mfe-profile | 4203 | http://localhost:4203 |
| mfe-summary | 4204 | http://localhost:4204 |
| mfe-documents | 4205 | http://localhost:4205 |
| web-cl (host) | 4202 | http://localhost:4202 |
| web-hs (host) | 4201 | http://localhost:4201 |
| BFF (backend) | 8080 | http://localhost:8080 |

### Remote Entry Points

```
http://localhost:4203/remoteEntry.js  # mfe-profile
http://localhost:4204/remoteEntry.js  # mfe-summary
http://localhost:4205/remoteEntry.js  # mfe-documents
```

### Custom Element Scripts

```html
<script type="module" src="http://localhost:4203/customElement"></script>
<script type="module" src="http://localhost:4204/customElement"></script>
```

---

**Last Updated:** 2025-11-16
