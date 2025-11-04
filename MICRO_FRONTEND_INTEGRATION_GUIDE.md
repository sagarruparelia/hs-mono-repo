# Micro-Frontend Integration Guide

This guide demonstrates how to integrate the Profile and Summary micro-frontends into your application, whether you're using React, Vue, Angular, or plain HTML/JavaScript.

## Table of Contents

1. [Overview](#overview)
2. [Available Micro-Frontends](#available-micro-frontends)
3. [Integration Methods](#integration-methods)
4. [React Integration](#react-integration)
5. [Vue Integration](#vue-integration)
6. [Angular Integration](#angular-integration)
7. [Vanilla JavaScript Integration](#vanilla-javascript-integration)
8. [Configuration Options](#configuration-options)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

## Overview

Our micro-frontends are built using Module Federation with Vite, allowing them to be consumed by any JavaScript application regardless of the framework. Each micro-frontend can run standalone or be integrated into a host application.

### Architecture

```
┌─────────────┐
│   Host App  │
│  (Any FW)   │
└──────┬──────┘
       │
       ├──────────┬──────────┐
       │          │          │
   ┌───▼───┐  ┌──▼───┐  ┌───▼────┐
   │Profile│  │Summary│  │  ...   │
   │  MFE  │  │  MFE  │  │ Future │
   └───────┘  └───────┘  └────────┘
```

## Available Micro-Frontends

### 1. Profile Page (mfe-profile)

**URL:** `http://localhost:4203`
**Entry Point:** `http://localhost:4203/remoteEntry.js`
**Exposed Modules:**
- `./ProfilePage` - React component
- `./bootstrap` - Framework-agnostic mount function

**Features:**
- User profile display and editing
- Avatar management
- Profile statistics
- Theme support (light/dark)

### 2. Summary Page (mfe-summary)

**URL:** `http://localhost:4204`
**Entry Point:** `http://localhost:4204/remoteEntry.js`
**Exposed Modules:**
- `./SummaryPage` - React component
- `./bootstrap` - Framework-agnostic mount function

**Features:**
- Activity summary dashboard
- Time range filtering (week/month/year)
- Recent activities list
- Metrics visualization
- Theme support (light/dark)

## Integration Methods

### Method 1: Module Federation (Recommended for React apps)

Use Module Federation to dynamically load the micro-frontends with shared dependencies.

**Pros:**
- Automatic dependency sharing
- Lazy loading
- Optimal bundle size
- TypeScript support

**Cons:**
- Requires build configuration
- Framework-specific setup

### Method 2: Framework-Agnostic Mounting (Recommended for non-React apps)

Use the bootstrap module to mount micro-frontends into any application.

**Pros:**
- Works with any framework
- Simple integration
- No build configuration needed
- Custom events for communication

**Cons:**
- No shared dependencies
- Larger bundle size

## React Integration

### Using Module Federation

#### 1. Install Dependencies

```bash
npm install --save-dev @module-federation/vite
```

#### 2. Configure vite.config.ts

```typescript
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
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
    react(),
  ],
});
```

#### 3. Create Type Declarations (remotes.d.ts)

```typescript
declare module 'mfe_profile/ProfilePage' {
  export interface ProfilePageProps {
    userId?: string;
    theme?: 'light' | 'dark';
    onUpdate?: (data: any) => void;
  }
  export function ProfilePage(props: ProfilePageProps): JSX.Element;
  export default ProfilePage;
}

declare module 'mfe_summary/SummaryPage' {
  export interface SummaryPageProps {
    userId?: string;
    theme?: 'light' | 'dark';
    timeRange?: 'week' | 'month' | 'year';
    onDataLoad?: (data: any) => void;
  }
  export function SummaryPage(props: SummaryPageProps): JSX.Element;
  export default SummaryPage;
}
```

#### 4. Use in Your Application

```tsx
import { Suspense, lazy } from 'react';

const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));
const SummaryPage = lazy(() => import('mfe_summary/SummaryPage'));

function App() {
  return (
    <div>
      <h1>My Application</h1>

      <Suspense fallback={<div>Loading Profile...</div>}>
        <ProfilePage
          theme="light"
          onUpdate={(data) => console.log('Profile updated:', data)}
        />
      </Suspense>

      <Suspense fallback={<div>Loading Summary...</div>}>
        <SummaryPage
          theme="dark"
          timeRange="month"
          onDataLoad={(data) => console.log('Summary loaded:', data)}
        />
      </Suspense>
    </div>
  );
}
```

## Vue Integration

### Using Dynamic Script Loading

#### 1. Create a Vue Component Wrapper

```vue
<!-- ProfileMFE.vue -->
<template>
  <div ref="mfeContainer" data-mfe="profile" :data-theme="theme" :data-user-id="userId"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  theme: { type: String, default: 'light' },
  userId: { type: String, default: '' }
});

const mfeContainer = ref(null);
let unmountFn = null;

onMounted(async () => {
  // Load the remote entry
  const script = userDocument.createElement('script');
  script.src = 'http://localhost:4203/remoteEntry.js';
  script.type = 'module';

  script.onload = async () => {
    // Import and mount the bootstrap module
    const { mount } = await import('http://localhost:4203/bootstrap.js');
    const instance = mount(mfeContainer.value, {
      theme: props.theme,
      userId: props.userId,
      onUpdate: (data) => {
        console.log('Profile updated:', data);
      }
    });

    unmountFn = instance.unmount;
  };

  userDocument.head.appendChild(script);
});

onUnmounted(() => {
  if (unmountFn) {
    unmountFn();
  }
});

watch(() => props.theme, (newTheme) => {
  // Remount with new theme
  if (unmountFn) {
    unmountFn();
  }
  // Trigger remount logic here
});
</script>
```

#### 2. Use the Wrapper in Your Application

```vue
<template>
  <div class="app">
    <h1>My Vue Application</h1>
    <ProfileMFE theme="light" userId="user123" />
  </div>
</template>

<script setup>
import ProfileMFE from './components/ProfileMFE.vue';
</script>
```

## Angular Integration

### Using Dynamic Module Loading

#### 1. Create an Angular Component Wrapper

```typescript
// profile-mfe.component.ts
import { Component, ElementRef, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';

@Component({
  selector: 'app-profile-mfe',
  template: '<div #mfeContainer></div>',
})
export class ProfileMfeComponent implements OnInit, OnDestroy {
  @ViewChild('mfeContainer', { static: true }) mfeContainer!: ElementRef;
  @Input() theme: 'light' | 'dark' = 'light';
  @Input() userId: string = '';

  private unmountFn?: () => void;

  async ngOnInit() {
    // Dynamically load the remote entry
    const script = userDocument.createElement('script');
    script.src = 'http://localhost:4203/remoteEntry.js';
    script.type = 'module';

    script.onload = async () => {
      // Import the bootstrap module
      const module = await import('http://localhost:4203/bootstrap.js');
      const instance = module.mount(this.mfeContainer.nativeElement, {
        theme: this.theme,
        userId: this.userId,
        onUpdate: (data: any) => {
          console.log('Profile updated:', data);
        }
      });

      this.unmountFn = instance.unmount;
    };

    userDocument.head.appendChild(script);
  }

  ngOnDestroy() {
    if (this.unmountFn) {
      this.unmountFn();
    }
  }
}
```

#### 2. Use in Your Angular App

```typescript
// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1>My Angular Application</h1>
    <app-profile-mfe theme="light" userId="user123"></app-profile-mfe>
  `
})
export class AppComponent { }
```

## Vanilla JavaScript Integration

### Method 1: Declarative (HTML Data Attributes)

The simplest way - just add a div with `data-mfe` attribute:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Website</title>
</head>
<body>
  <h1>My Website</h1>

  <!-- Profile Micro-Frontend -->
  <div
    data-mfe="profile"
    data-theme="light"
    data-user-id="user123"
  ></div>

  <!-- Summary Micro-Frontend -->
  <div
    data-mfe="summary"
    data-theme="dark"
    data-time-range="month"
  ></div>

  <!-- Load the micro-frontend bundles -->
  <script type="module" src="http://localhost:4203/remoteEntry.js"></script>
  <script type="module" src="http://localhost:4204/remoteEntry.js"></script>
</body>
</html>
```

The micro-frontends will automatically find and mount to elements with `data-mfe` attributes.

### Method 2: Programmatic (JavaScript API)

For more control, use the JavaScript API:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Website</title>
</head>
<body>
  <h1>My Website</h1>

  <div id="profile-container"></div>
  <div id="summary-container"></div>

  <script type="module">
    // Load Profile MFE
    import('http://localhost:4203/remoteEntry.js').then(async () => {
      const { mount } = await import('http://localhost:4203/bootstrap.js');
      const profileContainer = userDocument.getElementById('profile-container');

      const profileInstance = mount(profileContainer, {
        theme: 'light',
        userId: 'user123',
        onUpdate: (data) => {
          console.log('Profile updated:', data);
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('profileUpdate', { detail: data }));
        }
      });

      // Later, if needed, you can unmount:
      // profileInstance.unmount();
    });

    // Load Summary MFE
    import('http://localhost:4204/remoteEntry.js').then(async () => {
      const { mount } = await import('http://localhost:4204/bootstrap.js');
      const summaryContainer = userDocument.getElementById('summary-container');

      mount(summaryContainer, {
        theme: 'dark',
        timeRange: 'month',
        onDataLoad: (data) => {
          console.log('Summary data loaded:', data);
        }
      });
    });
  </script>
</body>
</html>
```

### Method 3: Using Custom Events

Listen to events from micro-frontends:

```html
<div id="profile-container" data-mfe="profile" data-theme="light"></div>

<script type="module">
  const container = userDocument.getElementById('profile-container');

  // Listen for profile updates
  container.addEventListener('profileUpdate', (event) => {
    console.log('Profile was updated:', event.detail);
    // Update your application state
  });

  // Load the MFE
  import('http://localhost:4203/remoteEntry.js');
</script>
```

## Configuration Options

### Profile Page Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | `'demo-user'` | The ID of the user whose profile to display |
| `theme` | `'light' \| 'dark'` | `'light'` | The color theme |
| `onUpdate` | `function` | `undefined` | Callback when profile is updated |

### Summary Page Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | `'demo-user'` | The ID of the user |
| `theme` | `'light' \| 'dark'` | `'light'` | The color theme |
| `timeRange` | `'week' \| 'month' \| 'year'` | `'month'` | Time range for summary data |
| `onDataLoad` | `function` | `undefined` | Callback when data is loaded |

## API Reference

### Bootstrap Module

#### `mount(element, props)`

Mounts the micro-frontend to a DOM element.

**Parameters:**
- `element` (HTMLElement): The container element
- `props` (Object): Configuration props

**Returns:**
- Object with `unmount()` function

**Example:**
```javascript
const instance = mount(userDocument.getElementById('container'), {
  theme: 'dark',
  userId: 'user123'
});

// Later...
instance.unmount();
```

#### `init()`

Auto-initializes all micro-frontends on the page by finding elements with `data-mfe` attributes.

**Returns:**
- Object with `unmountAll()` function

**Example:**
```javascript
const instances = init();

// Later, unmount all...
instances.unmountAll();
```

## Troubleshooting

### Issue: Micro-frontend not loading

**Solution:**
1. Ensure the MFE server is running (port 4203 for profile, 4204 for summary)
2. Check browser console for CORS errors
3. Verify the remote entry URL is correct

### Issue: Styles not appearing correctly

**Solution:**
1. Ensure CSS files are being loaded
2. Check for CSS conflicts with host application
3. Use CSS Modules or scoped styles

### Issue: React version mismatch

**Solution:**
1. Ensure all apps use the same React version (^19.0.0)
2. Configure `singleton: true` in shared dependencies
3. Check for multiple React instances in the console

### Issue: TypeScript errors

**Solution:**
1. Ensure `remotes.d.ts` is included in `tsconfig.json`
2. Verify type declarations match the MFE exports
3. Restart TypeScript server in your IDE

## Running the Examples

### Start the Micro-Frontends

```bash
# Terminal 1: Start Profile MFE
npx nx serve mfe-profile

# Terminal 2: Start Summary MFE
npx nx serve mfe-summary

# Terminal 3: Start Web CL Shell (optional)
npx nx serve web-cl

# Terminal 4: Start Web HS Shell (optional)
npx nx serve web-hs
```

### Access the Applications

- **Profile MFE (standalone):** http://localhost:4203
- **Summary MFE (standalone):** http://localhost:4204
- **Web CL Shell:** http://localhost:4202
- **Web HS Shell:** http://localhost:4201

## Production Deployment

### Building for Production

```bash
# Build all micro-frontends
npx nx run-many --target=build --projects=mfe-profile,mfe-summary

# Build a specific shell
npx nx build web-cl --prod
```

### Production URLs

Replace development URLs with production URLs:

```javascript
// Development
entry: 'http://localhost:4203/remoteEntry.js'

// Production
entry: 'https://mfe-profile.yourcompany.com/remoteEntry.js'
```

### Environment-Based Configuration

```typescript
const MFE_PROFILE_URL = process.env.VITE_MFE_PROFILE_URL || 'http://localhost:4203';

federation({
  remotes: {
    mfe_profile: {
      entry: `${MFE_PROFILE_URL}/remoteEntry.js`,
      // ...
    }
  }
})
```

## Best Practices

1. **Version Management**: Use semantic versioning for your MFEs
2. **Error Boundaries**: Wrap MFEs in error boundaries to prevent cascade failures
3. **Loading States**: Always provide loading fallbacks
4. **Communication**: Use custom events for cross-MFE communication
5. **Isolation**: Keep MFEs independent and self-contained
6. **Testing**: Test MFEs both standalone and integrated
7. **Monitoring**: Add error tracking and performance monitoring
8. **Documentation**: Keep this integration guide updated

## Support

For issues or questions:
- Check the troubleshooting section
- Review the Nx workspace documentation
- Contact the development team

## License

MIT
