# NPM Scripts Guide

This document describes all available npm scripts for the monorepo.

## Quick Start

```bash
# Start all applications (recommended for development)
npm start

# Build everything for production
npm run build

# Run all tests
npm test

# Lint all projects
npm run lint
```

## 🚀 Development Scripts

### Start All Applications

```bash
# Start all micro-frontends and shells in parallel (4 apps)
npm start
# Equivalent to: nx run-many --target=serve --projects=mfe-profile,mfe-summary,web-cl,web-hs --parallel=4
```

**Access:**
- mfe-profile: http://localhost:4203
- mfe-summary: http://localhost:4204
- web-cl: http://localhost:4202
- web-hs: http://localhost:4201

### Start Specific Groups

```bash
# Start only micro-frontends
npm run start:mfe
# Starts: mfe-profile, mfe-summary

# Start only shell applications
npm run start:shells
# Starts: web-cl, web-hs
```

### Start Individual Applications

```bash
npm run start:web-cl      # Start Client Portal (port 4202)
npm run start:web-hs      # Start Health Services (port 4201)
npm run start:profile     # Start Profile MFE (port 4203)
npm run start:summary     # Start Summary MFE (port 4204)
npm run start:bff         # Start Spring Boot backend
```

## 🏗️ Build Scripts

### Build All Projects

```bash
# Build all projects for production
npm run build
# Output: dist/apps/*
```

### Build Specific Groups

```bash
# Build only micro-frontends
npm run build:mfe
# Builds: mfe-profile, mfe-summary

# Build only shell applications
npm run build:shells
# Builds: web-cl, web-hs
```

### Build Individual Projects

```bash
npm run build:web-cl      # Build Client Portal
npm run build:web-hs      # Build Health Services
npm run build:profile     # Build Profile MFE
npm run build:summary     # Build Summary MFE
npm run build:bff         # Build Spring Boot backend
```

**Build Output:**
```
dist/
├── apps/
│   ├── mfe-profile/      # Contains remoteEntry.js
│   ├── mfe-summary/      # Contains remoteEntry.js
│   ├── web-cl/           # Static assets
│   ├── web-hs/           # Static assets
│   └── bff/              # Spring Boot JAR
```

## 🧪 Testing Scripts

### Run All Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Individual Projects

```bash
npm run test:web-cl       # Test Client Portal
npm run test:web-hs       # Test Health Services
npm run test:profile      # Test Profile MFE
npm run test:summary      # Test Summary MFE
```

### Coverage Reports

Coverage reports are generated in:
```
coverage/
├── apps/
│   ├── mfe-profile/
│   ├── mfe-summary/
│   ├── web-cl/
│   └── web-hs/
```

## 🔍 Linting Scripts

### Lint All Projects

```bash
# Lint all projects
npm run lint

# Lint and automatically fix issues
npm run lint:fix
```

### Lint Individual Projects

```bash
npm run lint:web-cl       # Lint Client Portal
npm run lint:web-hs       # Lint Health Services
npm run lint:profile      # Lint Profile MFE
npm run lint:summary      # Lint Summary MFE
```

## 📝 TypeScript Type Checking

```bash
# Type check all projects
npm run typecheck

# Type check individual projects
npm run typecheck:web-cl
npm run typecheck:web-hs
npm run typecheck:profile
npm run typecheck:summary
```

## 🎭 End-to-End Testing

```bash
# Run all E2E tests
npm run e2e

# Run E2E for specific apps
npm run e2e:web-cl        # E2E tests for Client Portal
npm run e2e:web-hs        # E2E tests for Health Services
```

## 🎨 Code Formatting

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

## 📊 Dependency Graph

```bash
# Visualize project dependencies in browser
npm run graph
```

This opens an interactive graph showing:
- Project dependencies
- Library usage
- Build order
- Affected projects

## 🎯 Affected Commands

Run tasks only on projects affected by changes:

```bash
# Build only affected projects
npm run affected:build

# Test only affected projects
npm run affected:test

# Lint only affected projects
npm run affected:lint

# E2E only affected projects
npm run affected:e2e

# Show affected projects graph
npm run affected:graph
```

**How it works:**
Nx compares your current branch with the base branch (usually `main`) and only runs tasks on projects that have changed or depend on changed projects.

## 🧹 Cleanup Scripts

```bash
# Reset Nx cache
npm run clean
# Equivalent to: npm run reset

# Remove dist folder
npm run clean:dist

# Reset cache and remove .cache folders
npm run clean:cache

# Nuclear option: remove dist, node_modules, and cache
npm run clean:all
# Warning: You'll need to run `npm install` after this
```

## 🔄 Update Scripts

```bash
# Update Nx to latest version
npm run update

# Interactive update (choose what to update)
npm run update:check
```

## 📋 Common Workflows

### Full Development Setup

```bash
# Clone repo and setup
git clone <repo-url>
cd hs-mono-repo
npm install
npm start
```

### Before Committing

```bash
# Check everything
npm run lint
npm run typecheck
npm test
npm run format
```

### CI/CD Pipeline

```bash
# What CI typically runs
npm ci                    # Clean install
npm run lint              # Lint check
npm run typecheck         # Type check
npm test                  # Run tests
npm run build             # Build for production
npm run e2e               # E2E tests
```

### Working on a Feature

```bash
# Start only what you need
npm run start:profile     # If working on profile MFE
npm run start:web-cl      # If working on web-cl

# Run tests in watch mode
npm run test:watch

# Check affected projects
npm run affected:graph
```

### Production Build

```bash
# Full production build
npm run clean:dist        # Clean previous build
npm run build             # Build everything
```

## 🔧 Advanced Usage

### Custom Nx Commands

If you need to run custom Nx commands not in scripts:

```bash
# Run a specific target on a specific project
npx nx run web-cl:build

# Run with custom configuration
npx nx run web-cl:build:production

# Run with options
npx nx run web-cl:serve --port=3000

# Dry run (show what would be executed)
npx nx run-many --target=build --all --dry-run

# Skip cache
npx nx run web-cl:build --skip-nx-cache

# Verbose output
npx nx run web-cl:build --verbose
```

### Parallel Execution

```bash
# Control parallel execution
npx nx run-many --target=test --all --parallel=2
npx nx run-many --target=test --all --maxParallel=4
```

### Watch Mode

```bash
# Watch dependencies and rebuild
npx nx run web-cl:watch-deps
```

## 🎯 Targeting Multiple Projects

```bash
# Run on specific projects
npx nx run-many --target=build --projects=web-cl,web-hs

# Run on all except
npx nx run-many --target=test --all --exclude=bff

# Run on projects with tag
npx nx run-many --target=build --all --with-dependencies
```

## 📊 Performance Tips

1. **Use affected commands** when possible to save time
2. **Parallel execution** is enabled by default (adjust with `--parallel`)
3. **Nx cache** significantly speeds up repeated builds
4. **Use specific scripts** (e.g., `start:profile`) instead of starting everything

## 🐛 Troubleshooting

### Cache Issues

```bash
npm run clean              # Reset Nx cache
npm run clean:cache        # More thorough cleanup
```

### Build Issues

```bash
npm run clean:dist         # Remove old builds
npm run build              # Fresh build
```

### Dependency Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Conflicts

If ports are already in use:

```bash
# Kill processes on specific ports (macOS/Linux)
lsof -ti:4202 | xargs kill
lsof -ti:4203 | xargs kill
lsof -ti:4204 | xargs kill
```

Or modify port in `vite.config.ts`:

```typescript
server: {
  port: 4205,  // Change to available port
}
```

## 📚 Additional Resources

- **Nx Documentation:** https://nx.dev
- **Workspace Graph:** `npm run graph`
- **Module Federation Setup:** See `MODULE_FEDERATION_SETUP.md`
- **Integration Guide:** See `MICRO_FRONTEND_INTEGRATION_GUIDE.md`

## 💡 Pro Tips

1. **Use shell aliases** for frequently used commands:
   ```bash
   alias nxs="npm start"
   alias nxb="npm run build"
   alias nxt="npm test"
   ```

2. **Create custom scripts** in package.json for your workflow

3. **Use Nx Console** VSCode extension for GUI-based task execution

4. **Check affected** before running expensive operations:
   ```bash
   npm run affected:graph  # See what's affected first
   npm run affected:build  # Build only what's needed
   ```

5. **Combine scripts** using `&&` or `&`:
   ```bash
   npm run lint && npm test && npm run build  # Sequential
   npm run start:profile & npm run start:web-cl  # Parallel
   ```

## 📝 Script Categories Summary

| Category | Scripts | Purpose |
|----------|---------|---------|
| **Development** | `start*` | Start development servers |
| **Build** | `build*` | Build for production |
| **Testing** | `test*` | Run tests |
| **Linting** | `lint*` | Code quality checks |
| **Type Checking** | `typecheck*` | TypeScript validation |
| **E2E** | `e2e*` | End-to-end tests |
| **Formatting** | `format*` | Code formatting |
| **Affected** | `affected:*` | Run on changed projects |
| **Cleanup** | `clean*` | Remove generated files |
| **Utilities** | `graph`, `update` | Workspace utilities |

---

**Last Updated:** 2025-01-03
**Nx Version:** 22.0.2
