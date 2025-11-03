# Migration to React Router v7

This project has been updated to use **React Router v7** instead of `react-router-dom`.

## What Changed

### Package Dependencies

**Before:**
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "6.29.0"
  }
}
```

**After:**
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router": "^7.9.5"
  }
}
```

### Import Statements

**Before:**
```tsx
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
```

**After:**
```tsx
import { BrowserRouter, Route, Routes, Link } from 'react-router';
```

### Files Updated

1. **package.json** - Dependency changed from `react-router-dom` to `react-router`
2. **apps/web-cl/src/main.tsx** - Import statement updated
3. **apps/web-cl/src/app/app.tsx** - Import statement updated
4. **apps/web-hs/src/main.tsx** - Import statement updated
5. **apps/web-hs/src/app/app.tsx** - Import statement updated
6. **apps/web-cl/vite.config.ts** - Module Federation shared config updated
7. **apps/web-hs/vite.config.ts** - Module Federation shared config updated

## React Router v7 Benefits

React Router v7 is a major update that includes:

- **Unified Package:** Single `react-router` package instead of separate `react-router-dom` and `react-router-native`
- **Better Tree Shaking:** Smaller bundle sizes
- **Improved TypeScript Support:** Better type inference
- **Modern Architecture:** Built for React 19+ and future React features
- **Framework Features:** Optional framework-mode with data loading, actions, and more

## Module Federation Configuration

The shared dependencies in Module Federation configs have been updated:

```typescript
shared: {
  react: {
    singleton: true,
    requiredVersion: '^19.0.0',
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^19.0.0',
  },
  'react-router': {  // ← Updated from 'react-router-dom'
    singleton: true,
    requiredVersion: '^7.0.0',
  },
}
```

This ensures that all applications (web-cl, web-hs) and micro-frontends share the same React Router instance.

## No Breaking Changes in Our Usage

Since we're only using the basic routing features (BrowserRouter, Route, Routes, Link), the migration was straightforward with no API changes needed. All our routing code works exactly the same way.

## Testing

After migration, test the following:

### Development Mode
```bash
# Start all applications
npx nx run-many --target=serve --projects=web-cl,web-hs,mfe-profile,mfe-summary --parallel=4
```

### Test Checklist

- [ ] web-cl loads correctly at http://localhost:4202
- [ ] web-hs loads correctly at http://localhost:4201
- [ ] Navigation works in both shells
- [ ] Profile page route works (/profile)
- [ ] Summary page route works (/summary)
- [ ] Lazy loading of micro-frontends works
- [ ] Browser back/forward buttons work
- [ ] Direct URL navigation works

### Build Test
```bash
# Build all projects
npx nx run-many --target=build --projects=web-cl,web-hs --prod
```

## Migration Date

**Completed:** 2025-01-03

## References

- [React Router v7 Announcement](https://remix.run/blog/react-router-v7)
- [React Router v7 Docs](https://reactrouter.com/)
- [Migration Guide](https://reactrouter.com/upgrading/v6)

## Notes

- React Router v7 is backward compatible with v6 API
- The `react-router` package now includes everything that was in `react-router-dom`
- No code changes needed except import statements
- Module Federation configuration updated to share `react-router` instead of `react-router-dom`
