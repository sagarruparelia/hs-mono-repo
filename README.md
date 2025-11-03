# Enterprise Monorepo - Micro-Frontends Architecture

[![Nx](https://img.shields.io/badge/Nx-22.0.2-blue)](https://nx.dev)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.0.0-646CFF)](https://vitejs.dev)
[![Module Federation](https://img.shields.io/badge/Module%20Federation-Enabled-green)](https://module-federation.io)

A production-ready enterprise monorepo featuring Module Federation micro-frontends that work with any framework (React, Vue, Angular, or vanilla JavaScript).

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start all applications
npm start
```

**Access:**
- 🟣 **Web CL (Client Portal):** http://localhost:4202
- 🟢 **Web HS (Health Services):** http://localhost:4201
- 📋 **Profile MFE:** http://localhost:4203
- 📊 **Summary MFE:** http://localhost:4204

## 🎯 What's Inside

### Micro-Frontends
- **mfe-profile** - User profile management with edit capabilities
- **mfe-summary** - Activity dashboard with metrics and time filtering

### Shell Applications
- **web-cl** - Client portal (purple branding)
- **web-hs** - Health services portal (green branding)

### Backend
- **bff** - Spring Boot 3.5 backend-for-frontend

### Shared Libraries
- **shared-ui** - Reusable UI components

## 📚 Documentation

| Document | Description | Use When |
|----------|-------------|----------|
| **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** | Fast command lookup | You need a quick command |
| **[NPM_SCRIPTS_GUIDE.md](NPM_SCRIPTS_GUIDE.md)** | All npm scripts explained | Learning available commands |
| **[MICRO_FRONTENDS_README.md](MICRO_FRONTENDS_README.md)** | Quick start guide | Getting started |
| **[MODULE_FEDERATION_SETUP.md](MODULE_FEDERATION_SETUP.md)** | Technical architecture | Understanding the setup |
| **[MICRO_FRONTEND_INTEGRATION_GUIDE.md](MICRO_FRONTEND_INTEGRATION_GUIDE.md)** | Framework integration | Integrating MFEs into your app |
| **[MIGRATION_TO_REACT_ROUTER_V7.md](MIGRATION_TO_REACT_ROUTER_V7.md)** | Router migration notes | Understanding React Router v7 |

## 🚀 Common Commands

```bash
# Development
npm start                  # Start all apps
npm run start:mfe          # Start only micro-frontends
npm run start:shells       # Start only shell apps

# Building
npm run build              # Build all for production
npm run build:mfe          # Build only micro-frontends

# Testing
npm test                   # Run all tests
npm run test:coverage      # With coverage
npm run test:watch         # Watch mode

# Quality
npm run lint               # Lint all projects
npm run typecheck          # TypeScript check
npm run format             # Format code

# Utilities
npm run graph              # View dependency graph
npm run clean              # Reset cache
```

**See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more commands**

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Shell Applications                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │   Web CL     │      │   Web HS     │        │
│  │   :4202      │      │   :4201      │        │
│  └──────┬───────┘      └──────┬───────┘        │
└─────────┼────────────────────┼─────────────────┘
          │  Module Federation │
          ▼                    ▼
┌─────────────────────────────────────────────────┐
│           Micro-Frontends (Remote)              │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ mfe-profile  │      │ mfe-summary  │        │
│  │   :4203      │      │   :4204      │        │
│  └──────────────┘      └──────────────┘        │
└─────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────┐
│      Can be consumed by any framework:          │
│    React • Vue • Angular • Vanilla JS           │
└─────────────────────────────────────────────────┘
```

## 🎨 Key Features

✅ **Module Federation** - Dynamic runtime loading
✅ **Framework Agnostic** - Works with any framework
✅ **Independent Deployment** - Deploy MFEs separately
✅ **Shared Dependencies** - React singleton mode
✅ **Type Safe** - Full TypeScript support
✅ **Three Integration Methods** - Module Federation, Bootstrap API, Web Components
✅ **Theme Support** - Light/Dark modes
✅ **Production Ready** - Complete CI/CD setup

## 🔧 Tech Stack

### Frontend
- **React 19.2.0** - UI library
- **React Router 7** - Routing
- **Vite 7** - Build tool
- **TypeScript 5** - Type safety
- **Module Federation** - Micro-frontend architecture

### Backend
- **Spring Boot 3.5** - Java backend
- **Java 21** - Runtime

### Tooling
- **Nx 22** - Monorepo management
- **Vitest** - Testing
- **Playwright** - E2E testing
- **ESLint** - Linting
- **Prettier** - Formatting

## 🌐 Integration Examples

### React (Module Federation)
```tsx
import { lazy, Suspense } from 'react';
const ProfilePage = lazy(() => import('mfe_profile/ProfilePage'));

<Suspense fallback={<Loading />}>
  <ProfilePage theme="light" />
</Suspense>
```

### Vanilla JavaScript (Bootstrap API)
```html
<div id="profile"></div>
<script type="module">
  import('http://localhost:4203/bootstrap.js').then(({ mount }) => {
    mount(document.getElementById('profile'), { theme: 'dark' });
  });
</script>
```

### Web Components
```html
<mfe-profile theme="light" user-id="user123"></mfe-profile>
<script type="module" src="http://localhost:4203/remoteEntry.js"></script>
```

**See [MICRO_FRONTEND_INTEGRATION_GUIDE.md](MICRO_FRONTEND_INTEGRATION_GUIDE.md) for Vue, Angular, and more**

## 📦 Project Structure

```
hs-mono-repo/
├── apps/
│   ├── mfe-profile/          # Profile micro-frontend (4203)
│   ├── mfe-summary/          # Summary micro-frontend (4204)
│   ├── web-cl/               # Client portal (4202)
│   ├── web-hs/               # Health services (4201)
│   └── bff/                  # Spring Boot backend
├── libs/
│   └── shared-ui/            # Shared components
├── examples/
│   ├── third-party-integration.html
│   └── web-components-integration.html
├── dist/                     # Build output
└── package.json              # Scripts & dependencies
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific project
npm run test:profile

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run e2e
```

## 🏗️ Building for Production

```bash
# Build everything
npm run build

# Build output
dist/
├── apps/
│   ├── mfe-profile/      # Contains remoteEntry.js
│   ├── mfe-summary/      # Contains remoteEntry.js
│   ├── web-cl/           # Static assets
│   └── web-hs/           # Static assets
```

## 🚀 Deployment

Each micro-frontend can be deployed independently:

1. **Build:** `npm run build:profile`
2. **Deploy:** Upload `dist/apps/mfe-profile/` to CDN/S3
3. **Update:** Shell apps point to new URL

**Example Production URLs:**
```typescript
const MFE_PROFILE_URL = 'https://cdn.example.com/mfe-profile';
const MFE_SUMMARY_URL = 'https://cdn.example.com/mfe-summary';
```

## 🎯 Nx Features

```bash
# Dependency graph
npm run graph

# Affected projects
npm run affected:graph
npm run affected:build
npm run affected:test

# Cache management
npm run clean              # Reset Nx cache
npm run clean:dist         # Remove builds
```

## 💡 Development Workflow

### 1. Clone & Setup
```bash
git clone <repo-url>
cd hs-mono-repo
npm install
```

### 2. Start Development
```bash
npm start                  # Start all apps
```

### 3. Make Changes
```bash
# Work on your feature
npm run test:watch         # Test while developing
npm run lint:fix           # Fix linting issues
```

### 4. Before Commit
```bash
npm run lint
npm run typecheck
npm test
npm run format
```

### 5. Build & Deploy
```bash
npm run build
# Deploy dist/ folder
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **MFEs not loading** | Ensure all MFE servers are running |
| **Port conflicts** | Change ports in `vite.config.ts` |
| **Cache issues** | Run `npm run clean` |
| **Build failures** | Run `npm run clean:dist && npm run build` |
| **TypeScript errors** | Run `npm run typecheck` |

**See [NPM_SCRIPTS_GUIDE.md](NPM_SCRIPTS_GUIDE.md) for detailed troubleshooting**

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run quality checks: `npm run lint && npm test`
4. Submit a pull request

## 📄 License

MIT

## 🔗 Resources

- **Nx Documentation:** https://nx.dev
- **Module Federation:** https://module-federation.io
- **React Router v7:** https://reactrouter.com
- **Vite:** https://vitejs.dev

## 📞 Support

- 📖 Check documentation in this repo
- 🐛 Report issues in the issue tracker
- 💬 Contact the development team

---

**Built with ❤️ using Nx, React 19, and Module Federation**

**Version:** 1.0.0
**Last Updated:** January 2025
