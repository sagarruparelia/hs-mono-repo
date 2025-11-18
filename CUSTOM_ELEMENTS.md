# Custom Elements (Web Components) - Workspace Guide

This workspace supports creating standalone Web Components from MFEs that can be used in any HTML page without Module Federation.

## Quick Start

### Setup a New Custom Element

```bash
./scripts/setup-custom-element.sh <mfe-name> <component-name> <custom-element-tag>
```

**Example:**
```bash
./scripts/setup-custom-element.sh mfe-profile ProfilePage mfe-profile
```

This creates:
- ✅ `src/ce.tsx` - Custom element wrapper
- ✅ `vite.config.standalone.ts` - Build configuration
- ✅ `public/test-custom-element.html` - Test page
- ✅ `CUSTOM_ELEMENT.md` - MFE-specific documentation
- ✅ Adds `build-standalone` target to `project.json`

### Build and Deploy

```bash
# Build
nx build-standalone mfe-profile

# Or build and copy to public folder for testing
./scripts/build-and-deploy-ce.sh mfe-profile

# Or deploy to custom location
./scripts/build-and-deploy-ce.sh mfe-profile /path/to/static/assets
```

---

## Usage in HTML

After building, use the custom element in any HTML page:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="custom-element.css">
</head>
<body>
  <!-- Use your custom element -->
  <mfe-profile theme="light" user-id="123"></mfe-profile>

  <!-- Load the bundle -->
  <script type="module" src="custom-element.mjs"></script>

  <!-- Optional: Listen to events -->
  <script>
    document.addEventListener('component-update', (e) => {
      console.log('Updated:', e.detail);
    });
  </script>
</body>
</html>
```

---

## Available Scripts

### Setup Script

**Location:** `scripts/setup-custom-element.sh`

**Usage:**
```bash
./scripts/setup-custom-element.sh <mfe-name> <component-name> <custom-element-tag>
```

**What it does:**
1. Creates custom element wrapper (`src/ce.tsx`)
2. Creates standalone Vite config
3. Adds build target to `project.json`
4. Creates test HTML page
5. Generates documentation

### Build & Deploy Script

**Location:** `scripts/build-and-deploy-ce.sh`

**Usage:**
```bash
# Copy to public folder (for local testing)
./scripts/build-and-deploy-ce.sh mfe-profile

# Copy to custom destination
./scripts/build-and-deploy-ce.sh mfe-profile /path/to/deploy
```

**What it does:**
1. Builds the standalone bundle
2. Copies `.mjs` and `.css` files to destination

---

## Testing Locally

### Quick Test

```bash
# 1. Build the custom element
nx build-standalone mfe-profile

# 2. Copy to public folder
./scripts/build-and-deploy-ce.sh mfe-profile

# 3. Start dev server
nx serve mfe-profile

# 4. Open test page
# http://localhost:4203/test-custom-element.html
```

### Manual Testing

```bash
# Build
cd apps/mfe-profile
NODE_ENV=production npx vite build --config vite.config.standalone.ts --mode production

# Copy
cp ../../dist/apps/mfe-profile/standalone/custom-element.* public/

# Serve
nx serve mfe-profile
```

---

## How It Works

### The Problem

Direct imports of MFE source files from Vite dev server hang due to:
- Module Federation's shared dependencies
- Circular loading issues with shared React/ReactDOM
- JSX runtime conflicts between dev and production

### The Solution

1. **Standalone Build Config** - Separate Vite config without Module Federation
2. **Bundle Everything** - All dependencies included (React, ReactDOM, etc.)
3. **Production Mode** - Uses production JSX runtime
4. **Browser Compatible** - Defines `process.env` for browser environment

### Build Output

```
dist/apps/mfe-profile/standalone/
├── custom-element.mjs  (~500-800 KB)
└── custom-element.css  (~4 KB)
```

---

## Customization

### Adding Attributes

Edit `src/ce.tsx`:

```tsx
static get observedAttributes() {
  return [
    'theme',
    'user-id',
    'custom-attr',  // Add here
  ];
}

private mount() {
  const customAttr = this.getAttribute('custom-attr');
  // Use in component
}
```

### Adding Events

```tsx
this.dispatchEvent(
  new CustomEvent('my-custom-event', {
    detail: { data: 'value' },
    bubbles: true,
    composed: true,
  })
);
```

### Changing Component Props

```tsx
this.root.render(
  <YourComponent
    prop1={value1}
    prop2={value2}
    onEvent={(data) => {
      // Handle event
    }}
  />
);
```

---

## Production Deployment

### Option 1: Static CDN

Upload to CDN:
```
https://cdn.example.com/mfe-profile/custom-element.mjs
https://cdn.example.com/mfe-profile/custom-element.css
```

Use in HTML:
```html
<link rel="stylesheet" href="https://cdn.example.com/mfe-profile/custom-element.css">
<mfe-profile theme="light"></mfe-profile>
<script type="module" src="https://cdn.example.com/mfe-profile/custom-element.mjs"></script>
```

### Option 2: Same Origin

Copy to your static assets folder:
```bash
./scripts/build-and-deploy-ce.sh mfe-profile /var/www/static/js
```

### Option 3: BFF Integration

Copy to Spring Boot static resources:
```bash
./scripts/build-and-deploy-ce.sh mfe-profile apps/bff/src/main/resources/static
```

---

## Troubleshooting

### Build Errors

**Error:** `process is not defined`
- **Fix:** Ensure `define: { 'process.env.NODE_ENV': ... }` is in config

**Error:** `jsxDEV is not a function`
- **Fix:** Build with `--mode production` and `NODE_ENV=production`

**Error:** Path is undefined
- **Fix:** Ensure `outDir` is set in build config

### Runtime Errors

**Custom element not rendering**
- Check browser console for errors
- Verify both `.mjs` and `.css` are loaded
- Check custom element is registered: `customElements.get('mfe-profile')`

**Import hanging**
- Don't import from `/src/` directly in dev mode
- Use the standalone build instead

---

## Examples

See `apps/mfe-profile/` for a complete working example:
- `src/ce.tsx` - Custom element implementation
- `vite.config.standalone.ts` - Build configuration
- `public/test-standalone.html` - Test page
- `CUSTOM_ELEMENT.md` - Documentation

---

## FAQ

**Q: Can I use this in React/Vue/Angular?**
A: Yes! Web Components work in any framework.

**Q: Does this work with SSR?**
A: Custom elements are client-side only. Render on client mount.

**Q: How big is the bundle?**
A: ~500-800 KB for React + components (gzipped: ~120-150 KB)

**Q: Can I lazy load?**
A: Yes! Use dynamic `import()` in your HTML.

**Q: Production minification?**
A: Set `minify: true` in `vite.config.standalone.ts`

---

## Support

For issues or questions, see:
- MFE-specific docs: `apps/<mfe-name>/CUSTOM_ELEMENT.md`
- Vite docs: https://vitejs.dev
- Web Components: https://developer.mozilla.org/en-US/docs/Web/Web_Components
