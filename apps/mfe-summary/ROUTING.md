# MFE Summary - Child Routing Guide

## Overview

The Summary MFE now supports **framework-agnostic child routing** using TanStack Router with memory history. This allows the MFE to have internal navigation while remaining independent of the parent shell's routing framework.

## Key Features

✅ **Framework-Agnostic** - Works in any host environment (React, Vue, Angular, vanilla JS)
✅ **Memory-Based Routing** - No browser URL conflicts
✅ **Event-Driven Communication** - Custom events notify host of route changes
✅ **Backwards Compatible** - Legacy single-page mode still supported
✅ **Type-Safe** - Full TypeScript support with TanStack Router

---

## Routes

The MFE exposes three routes:

| Route | Path | Description |
|-------|------|-------------|
| Overview | `/` | Activity summary with metrics and time range selector |
| Details | `/details` | Detailed activity list with full descriptions |
| Analytics | `/analytics` | Analytics dashboard with activity breakdown |

---

## Usage Patterns

### 1. Custom Element (3rd Party Sites)

**Basic Usage:**
```html
<!-- Load from CDN -->
<script type="module" src="https://cdn.example.com/mfe/summary/v1.0.0/remoteEntry.js"></script>
<script type="module">
  import('https://cdn.example.com/mfe/summary/v1.0.0/customElement');
</script>

<!-- Use with routing -->
<mfe-summary
  use-router="true"
  route="/analytics"
  theme="dark"
  user-id-type="EID"
  user-id-value="E123456"
  logged-in-user-id-type="HSID"
  logged-in-user-id-value="HS789012">
</mfe-summary>
```

**Attributes:**
- `use-router` - Enable routing mode (default: `false`)
- `route` - Initial/current route (default: `/`)
- `theme` - UI theme: `light` or `dark` (default: `light`)
- `user-id-type` - Type of user ID: `EID`, `HSID`, `OHID`, `MSID` (default: `EID`)
- `user-id-value` - The actual user ID value (required)
- `logged-in-user-id-type` - Type of logged-in user ID (optional)
- `logged-in-user-id-value` - Value of logged-in user ID (optional)
- `user-id` - Legacy user identifier (backwards compatibility)

**Events:**
```javascript
const mfe = document.querySelector('mfe-summary');

// Listen for route changes
mfe.addEventListener('route-change', (e) => {
  console.log('Route changed to:', e.detail.route);
  console.log('From route:', e.detail.from);

  // Optional: sync to URL params, analytics, etc.
  const params = new URLSearchParams(window.location.search);
  params.set('summary-view', e.detail.route);
  history.replaceState(null, '', '?' + params.toString());
});

// Listen for data load
mfe.addEventListener('summary-data-load', (e) => {
  console.log('Data loaded:', e.detail);
});
```

**Programmatic Navigation:**
```javascript
// Navigate by changing the route attribute
mfe.setAttribute('route', '/details');
```

### 2. Module Federation (Shell Apps)

**Import and Use:**
```typescript
// Import the routed version
import SummaryPageWithRouter from 'mfe_summary/SummaryPageWithRouter';

function SummaryRoute() {
  const [currentRoute, setCurrentRoute] = useState('/');

  return (
    <SummaryPageWithRouter
      route={currentRoute}
      theme="light"
      userId="user-123"
      onRouteChange={(route) => {
        console.log('MFE navigated to:', route);
        setCurrentRoute(route);
      }}
      onDataLoad={(data) => {
        console.log('Data loaded:', data);
      }}
    />
  );
}
```

**Props:**
```typescript
interface SummaryPageWithRouterProps {
  // User identification (new format)
  userIdType?: string;              // Type of user ID (e.g., 'EID', 'HSID', 'OHID', 'MSID')
  userIdValue?: string;             // The actual ID value
  loggedInUserIdType?: string;      // Type of logged-in user ID
  loggedInUserIdValue?: string;     // Logged-in user ID value

  // Legacy support
  userId?: string;                  // Legacy user ID

  // UI and routing
  theme?: 'light' | 'dark';         // UI theme
  route?: string;                   // Current route

  // Callbacks
  onRouteChange?: (route: string) => void;  // Route change callback
  onDataLoad?: (data: any) => void;         // Data load callback
}
```

### 3. Shell Integration (Hybrid Mode)

**Shell controls top-level, MFE handles sub-routes:**

```typescript
// apps/web-cl/src/routes/summary/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const SummaryPageWithRouter = lazy(() =>
  import('mfe_summary/SummaryPageWithRouter')
);

export const Route = createFileRoute('/summary/')({
  component: SummaryIndexComponent,
});

function SummaryIndexComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SummaryPageWithRouter
        route="/"
        theme="light"
      />
    </Suspense>
  );
}
```

```typescript
// apps/web-cl/src/routes/summary/analytics.tsx
export const Route = createFileRoute('/summary/analytics')({
  component: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <SummaryPageWithRouter
        route="/analytics"  // MFE shows analytics
        theme="light"
      />
    </Suspense>
  ),
});
```

**URL Mapping:**
- Shell URL: `/summary` → MFE route: `/`
- Shell URL: `/summary/details` → MFE route: `/details`
- Shell URL: `/summary/analytics` → MFE route: `/analytics`

---

## Migration Guide

### From Legacy (Single Page) to Routed

**Before:**
```html
<mfe-summary theme="light" time-range="month"></mfe-summary>
```

**After:**
```html
<mfe-summary use-router="true" route="/" theme="light"></mfe-summary>
```

**Module Federation - Before:**
```typescript
import SummaryPage from 'mfe_summary/SummaryPage';
<SummaryPage theme="light" timeRange="month" />
```

**Module Federation - After:**
```typescript
import SummaryPageWithRouter from 'mfe_summary/SummaryPageWithRouter';
<SummaryPageWithRouter route="/" theme="light" />
```

---

## Technical Details

### Memory Router

The MFE uses **TanStack Router with memory history**, which means:
- ✅ No browser URL changes
- ✅ No conflicts with host page routing
- ✅ Internal navigation state maintained
- ✅ Works in iframes, modals, or any container

### Route State

Route state is:
1. **Initialized** from `route` prop/attribute
2. **Maintained** internally by memory router
3. **Synchronized** when prop/attribute changes
4. **Emitted** via `route-change` events

### Backwards Compatibility

The legacy `SummaryPage` component (single page, no router) is still available:

```typescript
import SummaryPage from 'mfe_summary/SummaryPage';
```

Custom element automatically falls back to legacy mode if `use-router` attribute is absent.

---

## Examples

### Example 1: Vanilla JS Site

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Site</title>
</head>
<body>
    <h1>My Dashboard</h1>

    <!-- Navigation -->
    <nav>
        <button onclick="showSummary('/')">Overview</button>
        <button onclick="showSummary('/details')">Details</button>
        <button onclick="showSummary('/analytics')">Analytics</button>
    </nav>

    <!-- MFE Container -->
    <mfe-summary id="summary" use-router="true"></mfe-summary>

    <script type="module">
        import('https://cdn.example.com/mfe/summary/v1.0.0/remoteEntry.js')
            .then(() => import('https://cdn.example.com/mfe/summary/v1.0.0/customElement'));
    </script>

    <script>
        function showSummary(route) {
            document.getElementById('summary').setAttribute('route', route);
        }

        // Sync MFE navigation to URL
        document.getElementById('summary').addEventListener('route-change', (e) => {
            const params = new URLSearchParams();
            params.set('view', e.detail.route);
            history.pushState(null, '', '?' + params.toString());
        });
    </script>
</body>
</html>
```

### Example 2: React App (Non-Module Federation)

```jsx
import { useEffect, useRef, useState } from 'react';

function SummaryWidget() {
  const ref = useRef(null);
  const [route, setRoute] = useState('/');

  useEffect(() => {
    // Load MFE
    import('https://cdn.example.com/mfe/summary/v1.0.0/remoteEntry.js')
      .then(() => import('https://cdn.example.com/mfe/summary/v1.0.0/customElement'));

    // Listen to events
    const handleRouteChange = (e) => {
      setRoute(e.detail.route);
    };

    ref.current?.addEventListener('route-change', handleRouteChange);
    return () => {
      ref.current?.removeEventListener('route-change', handleRouteChange);
    };
  }, []);

  return (
    <div>
      <p>Current view: {route}</p>
      <mfe-summary
        ref={ref}
        use-router="true"
        route={route}
        theme="light"
      />
    </div>
  );
}
```

### Example 3: Vue App

```vue
<template>
  <div>
    <button @click="navigateTo('/')">Overview</button>
    <button @click="navigateTo('/details')">Details</button>
    <button @click="navigateTo('/analytics')">Analytics</button>

    <mfe-summary
      ref="mfe"
      use-router="true"
      :route="currentRoute"
      theme="light"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentRoute: '/'
    };
  },
  mounted() {
    import('https://cdn.example.com/mfe/summary/v1.0.0/remoteEntry.js')
      .then(() => import('https://cdn.example.com/mfe/summary/v1.0.0/customElement'));

    this.$refs.mfe.addEventListener('route-change', (e) => {
      this.currentRoute = e.detail.route;
    });
  },
  methods: {
    navigateTo(route) {
      this.currentRoute = route;
    }
  }
};
</script>
```

---

## Best Practices

1. **Event Handling**: Always listen to `route-change` events if you need to sync MFE navigation with host state
2. **Theme Consistency**: Pass theme from host to MFE for consistent UI
3. **Error Handling**: Wrap MFE in error boundaries
4. **Loading States**: Show loading indicators while MFE initializes
5. **Analytics**: Use `route-change` events for tracking user navigation

---

## Troubleshooting

**MFE doesn't show routing:**
- Ensure `use-router="true"` attribute is set
- Check browser console for errors
- Verify remoteEntry.js loaded successfully

**Route changes don't work:**
- Check if `route` attribute is being updated
- Verify event listeners are attached
- Check for JavaScript errors

**Styles conflict:**
- MFE uses scoped CSS via class names
- Use shadow DOM if full isolation needed

**Data not loading:**
- Verify `user-id` attribute is set
- Check network tab for API calls
- Listen to `summary-data-load` event

---

## API Reference

### Custom Element

```typescript
<mfe-summary
  use-router="true"                         // Enable routing
  route="/analytics"                        // Current route
  theme="dark"                              // UI theme
  user-id-type="EID"                        // Type of user ID
  user-id-value="E123456"                   // User ID value
  logged-in-user-id-type="HSID"            // Logged-in user ID type (optional)
  logged-in-user-id-value="HS789012"       // Logged-in user ID value (optional)
/>
```

### Events

```typescript
// Route changed
interface RouteChangeEvent {
  detail: {
    route: string;  // New route
    from: string;   // Previous route
  }
}

// Data loaded
interface DataLoadEvent {
  detail: {
    metrics: Metric[];
    recentActivities: Activity[];
    lastUpdated: string;
  }
}
```

### React Component

```typescript
interface SummaryPageWithRouterProps {
  // User identification (new format)
  userIdType?: string;              // Type of user ID (e.g., 'EID', 'HSID', 'OHID', 'MSID')
  userIdValue?: string;             // The actual ID value
  loggedInUserIdType?: string;      // Type of logged-in user ID
  loggedInUserIdValue?: string;     // Logged-in user ID value

  // Legacy support
  userId?: string;                  // Legacy user ID

  // UI and routing
  theme?: 'light' | 'dark';         // UI theme
  route?: string;                   // Current route

  // Callbacks
  onRouteChange?: (route: string) => void;  // Route change callback
  onDataLoad?: (data: any) => void;         // Data load callback
}
```

---

## Next Steps

- See `example-standalone.html` for a complete working example
- Check shell integration in `apps/web-cl/src/routes/summary/`
- Review `mfe-profile` for similar routing pattern
