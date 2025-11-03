# Quick Reference Card

Fast command reference for common tasks in this monorepo.

## 🚀 Most Common Commands

```bash
npm start                  # Start all apps (MFEs + Shells)
npm test                   # Run all tests
npm run lint               # Lint all projects
npm run build              # Build everything for production
npm run graph              # Visualize dependencies
```

## 🎯 Development

| Command | Description |
|---------|-------------|
| `npm start` | Start all 4 apps (profile, summary, web-cl, web-hs) |
| `npm run start:mfe` | Start only micro-frontends |
| `npm run start:shells` | Start only shell apps |
| `npm run start:profile` | Start Profile MFE (4203) |
| `npm run start:summary` | Start Summary MFE (4204) |
| `npm run start:web-cl` | Start Web CL Shell (4202) |
| `npm run start:web-hs` | Start Web HS Shell (4201) |

## 🏗️ Building

| Command | Description |
|---------|-------------|
| `npm run build` | Build all projects (production) |
| `npm run build:mfe` | Build only micro-frontends |
| `npm run build:shells` | Build only shells |
| `npm run build:profile` | Build Profile MFE |
| `npm run build:summary` | Build Summary MFE |
| `npm run build:web-cl` | Build Web CL |
| `npm run build:web-hs` | Build Web HS |

## 🧪 Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage |
| `npm run test:profile` | Test Profile MFE |
| `npm run test:summary` | Test Summary MFE |
| `npm run test:web-cl` | Test Web CL |
| `npm run test:web-hs` | Test Web HS |

## 🔍 Quality Checks

| Command | Description |
|---------|-------------|
| `npm run lint` | Lint all projects |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run typecheck` | TypeScript check all |
| `npm run format` | Format all code |
| `npm run format:check` | Check formatting |

## 🎭 E2E Testing

| Command | Description |
|---------|-------------|
| `npm run e2e` | Run all E2E tests |
| `npm run e2e:web-cl` | E2E for Web CL |
| `npm run e2e:web-hs` | E2E for Web HS |

## 🎯 Affected (Smart)

| Command | Description |
|---------|-------------|
| `npm run affected:build` | Build only changed |
| `npm run affected:test` | Test only changed |
| `npm run affected:lint` | Lint only changed |
| `npm run affected:graph` | Show what's affected |

## 🧹 Cleanup

| Command | Description |
|---------|-------------|
| `npm run clean` | Reset Nx cache |
| `npm run clean:dist` | Remove dist folder |
| `npm run clean:cache` | Deep cache clean |
| `npm run clean:all` | Nuclear (dist + node_modules) |

## 📊 Utilities

| Command | Description |
|---------|-------------|
| `npm run graph` | Dependency graph (opens browser) |
| `npm run update` | Update Nx to latest |
| `npm run update:check` | Interactive update |

## 🌐 URLs (Default Ports)

| App | URL |
|-----|-----|
| **Profile MFE** | http://localhost:4203 |
| **Summary MFE** | http://localhost:4204 |
| **Web CL Shell** | http://localhost:4202 |
| **Web HS Shell** | http://localhost:4201 |

## 📁 Project Structure

```
apps/
├── mfe-profile/          # Profile micro-frontend
├── mfe-summary/          # Summary micro-frontend
├── web-cl/               # Client portal shell
├── web-hs/               # Health services shell
└── bff/                  # Spring Boot backend

libs/
└── shared-ui/            # Shared components

examples/
├── third-party-integration.html
└── web-components-integration.html
```

## 🔧 Nx Direct Commands

```bash
# If you need direct Nx access
npx nx serve web-cl
npx nx build web-cl --prod
npx nx test web-cl --watch
npx nx lint web-cl --fix
npx nx graph
npx nx reset
```

## 💡 Workflow Examples

### Starting Fresh
```bash
git clone <repo>
cd hs-mono-repo
npm install
npm start
```

### Before Committing
```bash
npm run lint
npm run typecheck
npm test
npm run format
```

### Production Build
```bash
npm run clean:dist
npm run build
```

### Working on Feature
```bash
# Start only what you need
npm run start:web-cl

# Test in watch mode
npm run test:watch

# Check affected
npm run affected:graph
```

### After Git Pull
```bash
npm install              # Update dependencies
npm run clean            # Clear cache
npm start                # Restart
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port in use | Change port in `vite.config.ts` or kill process |
| MFE not loading | Check all MFE servers running |
| Cache issues | `npm run clean` |
| Build issues | `npm run clean:dist && npm run build` |
| TypeScript errors | `npm run typecheck` to see all errors |
| Format issues | `npm run format` |

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **NPM_SCRIPTS_GUIDE.md** | Detailed script documentation |
| **MODULE_FEDERATION_SETUP.md** | Architecture & setup |
| **MICRO_FRONTEND_INTEGRATION_GUIDE.md** | Integration for all frameworks |
| **MICRO_FRONTENDS_README.md** | Quick start guide |

## 🎨 Examples

```bash
# Open examples in browser
open examples/third-party-integration.html
open examples/web-components-integration.html
```

## 🔥 Power User Tips

```bash
# Combine commands
npm run lint && npm test && npm run build

# Run in background
npm run start:profile &
npm run start:summary &

# Watch multiple projects
npx nx run-many --target=test --projects=web-cl,web-hs --watch

# Build with specific config
npx nx build web-cl --configuration=staging

# Skip cache for fresh build
npx nx build web-cl --skip-nx-cache
```

---

**Version:** 1.0
**Last Updated:** 2025-01-03
**For detailed docs, see:** NPM_SCRIPTS_GUIDE.md
