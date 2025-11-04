# Module Federation Setup - Complete

This userDocument summarizes the Module Federation setup for the micro-frontends architecture in this monorepo.

## What Was Built

### Micro-Frontends

#### 1. **mfe-profile** (Port 4203)
- **Location:** `apps/mfe-profile`
- **Component:** ProfilePage - User profile management with edit capabilities
- **Features:**
  - Profile display and editing
  - Avatar management
  - User statistics (Projects, Followers, Following)
  - Light/Dark theme support
  - Event-based updates

#### 2. **mfe-summary** (Port 4204)
- **Location:** `apps/mfe-summary`
- **Component:** SummaryPage - Activity summary dashboard
- **Features:**
  - Activity metrics dashboard
  - Time range filtering (Week/Month/Year)
  - Recent activities list
  - Completion rate tracking
  - Light/Dark theme support

### Shell Applications

#### 1. **web-cl** (Port 4202) - Client Portal
- **Location:** `apps/web-cl`
- **Branding:** Purple gradient theme
- **Purpose:** Client-facing portal
- **Consumes:** Both mfe-profile and mfe-summary
- **Features:**
  - Dynamic routing
  - Lazy loading of MFEs
  - Theme toggle
  - Suspense with loading states

#### 2. **web-hs** (Port 4201) - Health Services
- **Location:** `apps/web-hs`
- **Branding:** Green/Teal gradient theme
- **Purpose:** Healthcare professionals portal
- **Consumes:** Both mfe-profile and mfe-summary
- **Features:**
  - Dynamic routing
  - Lazy loading of MFEs
  - Theme toggle
  - Suspense with loading states

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Host Applications                  │
│                                                       │
│  ┌─────────────────┐       ┌─────────────────┐      │
│  │    Web CL       │       │    Web HS       │      │
│  │  (Port 4202)    │       │  (Port 4201)    │      │
│  │  Client Portal  │       │ Health Services │      │
│  └────────┬────────┘       └────────┬────────┘      │
│           │                         │               │
└───────────┼─────────────────────────┼───────────────┘
            │                         │
            │    Module Federation    │
            │                         │
    ────────┴─────────────────────────┴────────
            │                         │
┌───────────┼─────────────────────────┼───────────────┐
│           │    Micro-Frontends      │               │
│           │                         │               │
│  ┌────────▼────────┐       ┌────────▼────────┐     │
│  │  mfe-profile    │       │  mfe-summary    │     │
│  │  (Port 4203)    │       │  (Port 4204)    │     │
│  │  ProfilePage    │       │  SummaryPage    │     │
│  └─────────────────┘       └─────────────────┘     │
│                                                     │
│  Can also be consumed by:                          │
│  - 3rd Party React Apps                            │
│  - Vue Applications                                │
│  - Angular Applications                            │
│  - Plain HTML/JavaScript Sites                     │
└─────────────────────────────────────────────────────┘
```

## Key Features

### 1. Module Federation with Vite
- Uses `@module-federation/vite` for modern, fast builds
- Exposes components via `remoteEntry.js`
- Shared dependencies (React, React-DOM) with singleton mode
- Type-safe imports with TypeScript declarations

### 2. Framework-Agnostic Support
- Each MFE includes a `bootstrap.tsx` module
- Provides `mount()` and `init()` functions
- Can be used in any JavaScript framework or vanilla JS
- Supports declarative mounting via HTML data attributes

### 3. Independent Deployment
- Each MFE can be built and deployed separately
- Shell apps dynamically load MFEs at runtime
- Version management through remote entry URLs
- Zero downtime updates possible

### 4. Shared Theme System
- Both MFEs support light/dark themes
- Props passed from shell apps
- Consistent styling across all apps
- CSS-in-JS approach with scoped styles

## Running the Applications

### Development Mode

Start all applications simultaneously:

```bash
# Start everything (recommended)
npm start
```

Or start specific apps:

```bash
npm run start:profile     # Profile MFE → http://localhost:4203
npm run start:summary     # Summary MFE → http://localhost:4204
npm run start:web-cl      # Web CL Shell → http://localhost:4202
npm run start:web-hs      # Web HS Shell → http://localhost:4201
```

**See all available commands:** `NPM_SCRIPTS_GUIDE.md`

### Building for Production

```bash
# Build all projects
npm run build

# Build specific projects
npm run build:profile
npm run build:summary
npm run build:web-cl
npm run build:web-hs
```

## File Structure

```
apps/
├── mfe-profile/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProfilePage.tsx        # Main profile component
│   │   │   └── ProfilePage.css        # Scoped styles
│   │   ├── bootstrap.tsx              # Framework-agnostic mount
│   │   └── app/app.tsx                # Standalone app entry
│   └── vite.config.ts                 # Module Federation config
│
├── mfe-summary/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SummaryPage.tsx        # Main summary component
│   │   │   └── SummaryPage.css        # Scoped styles
│   │   ├── bootstrap.tsx              # Framework-agnostic mount
│   │   └── app/app.tsx                # Standalone app entry
│   └── vite.config.ts                 # Module Federation config
│
├── web-cl/
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.tsx                # Main shell app
│   │   │   └── app.css                # Shell styles
│   │   └── remotes.d.ts               # TypeScript declarations
│   └── vite.config.ts                 # Consumer config
│
└── web-hs/
    ├── src/
    │   ├── app/
    │   │   ├── app.tsx                # Main shell app
    │   │   └── app.css                # Shell styles (health theme)
    │   └── remotes.d.ts               # TypeScript declarations
    └── vite.config.ts                 # Consumer config
```

## Exposed Modules

### mfe-profile
```javascript
{
  './ProfilePage': './src/components/ProfilePage.tsx',
  './bootstrap': './src/bootstrap.tsx'
}
```

### mfe-summary
```javascript
{
  './SummaryPage': './src/components/SummaryPage.tsx',
  './bootstrap': './src/bootstrap.tsx'
}
```

## Integration Examples

### React (Module Federation)
```tsx
import { lazy, Suspense } from 'react';

const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePage theme="light" userId="user123" />
    </Suspense>
  );
}
```

### Vanilla JavaScript
```html
<div id="profile" data-mfe="profile" data-theme="light"></div>
<script type="module" src="http://localhost:4203/remoteEntry.js"></script>
```

### Programmatic Mount
```javascript
import('http://localhost:4203/bootstrap.js').then(({ mount }) => {
  const container = userDocument.getElementById('profile');
  const instance = mount(container, {
    theme: 'dark',
    onUpdate: (data) => console.log(data)
  });
});
```

## Configuration

### Environment Variables

Create `.env` files for different environments:

```env
# Development
VITE_MFE_PROFILE_URL=http://localhost:4203
VITE_MFE_SUMMARY_URL=http://localhost:4204

# Production
VITE_MFE_PROFILE_URL=https://mfe-profile.yourcompany.com
VITE_MFE_SUMMARY_URL=https://mfe-summary.yourcompany.com
```

### Vite Config (Dynamic URLs)

```typescript
const MFE_PROFILE_URL = import.meta.env.VITE_MFE_PROFILE_URL || 'http://localhost:4203';

federation({
  remotes: {
    mfe_profile: {
      entry: `${MFE_PROFILE_URL}/remoteEntry.js`,
      // ...
    }
  }
})
```

## Testing

### Unit Tests
```bash
# Test a specific MFE
npx nx test mfe-profile

# Test all projects
npx nx run-many --target=test --all
```

### E2E Tests
```bash
# Run E2E tests for web-cl
npx nx e2e web-cl-e2e

# Run E2E tests for web-hs
npx nx e2e web-hs-e2e
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure all MFE servers are running
   - Check network tab for failed requests
   - Verify URLs in remote configuration

2. **React Version Mismatch**
   - All apps use React 19.2.0
   - Ensure `singleton: true` in shared config
   - Clear node_modules and reinstall if needed

3. **TypeScript Errors**
   - Ensure `remotes.d.ts` exists
   - Check imports match exposed modules
   - Restart TypeScript server

4. **Styles Not Loading**
   - Check CSS imports in components
   - Verify CSS files are in dist output
   - Use CSS Modules to avoid conflicts

## Next Steps

### Recommended Enhancements

1. **Authentication Integration**
   - Add OIDC PKCE flow as per enterprise specs
   - Integrate with HSID identity provider
   - Share auth state across MFEs

2. **State Management**
   - Add shared state library (Redux/Zustand)
   - Implement cross-MFE communication
   - Add event bus for MFE coordination

3. **Error Handling**
   - Add error boundaries in shell apps
   - Implement fallback UIs
   - Add error tracking (Sentry)

4. **Performance**
   - Add bundle analysis
   - Implement preloading strategies
   - Add performance monitoring

5. **CI/CD**
   - Set up automated builds
   - Implement version tagging
   - Add deployment pipelines

6. **Documentation**
   - Add Storybook for components
   - Create API documentation
   - Add architecture diagrams

## Resources

- **Integration Guide:** See `MICRO_FRONTEND_INTEGRATION_GUIDE.md`
- **Nx Documentation:** https://nx.dev
- **Module Federation:** https://module-federation.io
- **Vite Module Federation:** https://github.com/module-federation/vite

## Support

For questions or issues:
1. Check the integration guide
2. Review this setup userDocument
3. Check Nx and Module Federation docs
4. Contact the development team

---

**Setup completed on:** 2025-01-03
**Module Federation Version:** @module-federation/vite (latest)
**Nx Version:** 22.0.2
**React Version:** 19.2.0
**Vite Version:** 7.0.0
