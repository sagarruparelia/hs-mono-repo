# Micro-Frontends Architecture - Quick Start Guide

This monorepo contains a complete Module Federation setup with micro-frontends that can be consumed by React apps, Vue, Angular, or plain HTML/JavaScript.

## 🚀 Quick Start

### 1. Start All Applications

```bash
# Start all micro-frontends and shells in parallel
npm start
```

Or start them individually:

```bash
npm run start:profile     # Profile MFE (port 4203)
npm run start:summary     # Summary MFE (port 4204)
npm run start:web-cl      # Client Portal (port 4202)
npm run start:web-hs      # Health Services (port 4201)
```

**See all available scripts:** `NPM_SCRIPTS_GUIDE.md`

### 2. Access the Applications

- **Profile MFE (standalone):** http://localhost:4203
- **Summary MFE (standalone):** http://localhost:4204
- **Web CL Shell (Client Portal):** http://localhost:4202
- **Web HS Shell (Health Services):** http://localhost:4201

### 3. View Third-Party Integration Example

Open the example HTML file in your browser:

```bash
# Open the example in your default browser
open examples/third-party-integration.html
```

This demonstrates how any website can embed the micro-frontends without React.

## 📁 Repository Structure

```
hs-mono-repo/
├── apps/
│   ├── mfe-profile/          # Profile micro-frontend (Port 4203)
│   ├── mfe-summary/          # Summary micro-frontend (Port 4204)
│   ├── web-cl/               # Client portal shell (Port 4202)
│   ├── web-hs/               # Health services shell (Port 4201)
│   └── bff/                  # Spring Boot backend
│
├── libs/
│   └── shared-ui/            # Shared UI components library
│
├── examples/
│   └── third-party-integration.html    # Vanilla JS example
│
├── MICRO_FRONTEND_INTEGRATION_GUIDE.md  # Comprehensive integration guide
├── MODULE_FEDERATION_SETUP.md           # Technical setup documentation
└── README.md                            # This file
```

## 🎯 What's Included

### Micro-Frontends

| Name | Port | Description | Exposes |
|------|------|-------------|---------|
| **mfe-profile** | 4203 | User profile management | `./ProfilePage`, `./bootstrap` |
| **mfe-summary** | 4204 | Activity summary dashboard | `./SummaryPage`, `./bootstrap` |

### Shell Applications

| Name | Port | Branding | Purpose |
|------|------|----------|---------|
| **web-cl** | 4202 | Purple gradient | Client-facing portal |
| **web-hs** | 4201 | Green/Teal | Healthcare professionals |

Both shells consume the same micro-frontends with different themes and branding.

## 🔧 How It Works

### Module Federation

The micro-frontends use **@module-federation/vite** to:
- Expose React components
- Share dependencies (React, React-DOM)
- Enable dynamic loading at runtime
- Support independent deployment

### Framework-Agnostic Support

Each MFE includes a `bootstrap` module that provides:
```javascript
// Programmatic mounting
mount(element, props) → { unmount }

// Auto-initialization via data attributes
init() → { unmountAll }
```

## 💡 Integration Examples

### React (Recommended for React apps)

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

### Vanilla JavaScript (Declarative)

```html
<div data-mfe="profile" data-theme="light" data-user-id="user123"></div>
<script type="module" src="http://localhost:4203/remoteEntry.js"></script>
```

### Vanilla JavaScript (Programmatic)

```javascript
import('http://localhost:4203/bootstrap.js').then(({ mount }) => {
  const instance = mount(userDocument.getElementById('container'), {
    theme: 'dark',
    onUpdate: (data) => console.log(data)
  });

  // Later: instance.unmount();
});
```

### Vue, Angular, etc.

See the comprehensive guide: **MICRO_FRONTEND_INTEGRATION_GUIDE.md**

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **MICRO_FRONTEND_INTEGRATION_GUIDE.md** | Complete integration guide for all frameworks |
| **MODULE_FEDERATION_SETUP.md** | Technical architecture and setup details |
| **examples/third-party-integration.html** | Working example for vanilla JS integration |

## 🛠️ Development Workflow

### Building

```bash
# Build all projects
npx nx run-many --target=build --all

# Build specific MFE
npx nx build mfe-profile --prod

# Build specific shell
npx nx build web-cl --prod
```

### Testing

```bash
# Test all projects
npx nx run-many --target=test --all

# Test specific project
npx nx test mfe-profile

# Run with coverage
npx nx test mfe-profile --coverage
```

### Linting

```bash
# Lint all projects
npx nx run-many --target=lint --all

# Lint specific project
npx nx lint mfe-profile
```

### Visualize Dependencies

```bash
# View the dependency graph
npx nx graph
```

## 🔑 Key Features

### ✅ Independent Deployment
Each micro-frontend can be built and deployed separately without affecting others.

### ✅ Framework Agnostic
Use in React, Vue, Angular, or plain HTML/JavaScript.

### ✅ Shared Dependencies
React and React-DOM are shared as singletons to avoid duplication.

### ✅ Type Safe
TypeScript declarations for all exposed modules.

### ✅ Theme Support
Light and dark themes supported across all MFEs.

### ✅ Event-Based Communication
Custom events for framework-agnostic communication.

## 🎨 Customization

### Changing Remote URLs for Production

Update `vite.config.ts` in shell apps:

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

Then create `.env` files:

```env
# .env.production
VITE_MFE_PROFILE_URL=https://mfe-profile.yourcompany.com
VITE_MFE_SUMMARY_URL=https://mfe-summary.yourcompany.com
```

### Adding New Micro-Frontends

1. Create a new Nx app:
```bash
npx nx g @nx/react:app my-new-mfe
```

2. Install Module Federation:
```bash
npm install --save-dev @module-federation/vite
```

3. Configure `vite.config.ts` to expose modules (see existing MFEs)

4. Create a `bootstrap.tsx` for framework-agnostic usage

5. Update shell apps to consume the new MFE

## 🐛 Troubleshooting

### MFEs Not Loading

**Problem:** Shell apps show loading spinner indefinitely

**Solution:**
1. Ensure all MFE servers are running (`npx nx serve mfe-profile` and `npx nx serve mfe-summary`)
2. Check browser console for CORS or network errors
3. Verify the remote URLs in `vite.config.ts` match the running servers

### TypeScript Errors

**Problem:** TypeScript can't find module declarations

**Solution:**
1. Ensure `remotes.d.ts` exists in the shell app
2. Check `tsconfig.json` includes the declarations file
3. Restart TypeScript server in your IDE

### React Version Mismatch

**Problem:** Multiple instances of React in the console

**Solution:**
1. Ensure all projects use React 19.2.0
2. Verify `singleton: true` in Module Federation config
3. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Styles Not Appearing

**Problem:** Components render but have no styling

**Solution:**
1. Check CSS files are imported in components
2. Verify CSS files are in the build output (`dist` folder)
3. Check for CSS conflicts with host application styles

## 📦 Production Build

### Build All Projects

```bash
npx nx run-many --target=build --all --configuration=production
```

### Build Output

```
dist/
├── apps/
│   ├── mfe-profile/          # Contains remoteEntry.js
│   ├── mfe-summary/          # Contains remoteEntry.js
│   ├── web-cl/               # Static assets
│   └── web-hs/               # Static assets
```

### Deployment

Each micro-frontend can be deployed to:
- **Static hosting:** AWS S3, Netlify, Vercel
- **CDN:** CloudFront, Cloudflare
- **Container:** Docker + Nginx

Example Nginx config:
```nginx
server {
  listen 80;
  server_name mfe-profile.example.com;

  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;

    # Enable CORS
    add_header Access-Control-Allow-Origin *;
  }
}
```

## 🚦 Next Steps

1. **Explore the Examples**
   - Open `examples/third-party-integration.html` in your browser
   - Try changing themes and time ranges
   - Check the browser console for event logs

2. **Read the Integration Guide**
   - Open `MICRO_FRONTEND_INTEGRATION_GUIDE.md`
   - Follow examples for your framework (React, Vue, Angular, etc.)
   - Learn about advanced patterns

3. **Review the Architecture**
   - Open `MODULE_FEDERATION_SETUP.md`
   - Understand the technical implementation
   - Plan your customizations

4. **Add Authentication**
   - Integrate OIDC PKCE flow (see enterprise specs)
   - Share auth state across MFEs
   - Protect routes and API calls

5. **Enhance with Your Features**
   - Create new micro-frontends
   - Add more shared libraries
   - Implement state management

## 📞 Support

- **Documentation:** See `MICRO_FRONTEND_INTEGRATION_GUIDE.md`
- **Nx Docs:** https://nx.dev
- **Module Federation:** https://module-federation.io
- **Issues:** Contact the development team

## 📝 License

MIT

---

**Built with:**
- Nx 22.0.2
- React 19.2.0
- Vite 7.0.0
- @module-federation/vite (latest)

**Last Updated:** January 2025
