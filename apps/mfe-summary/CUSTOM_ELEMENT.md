# Custom Element Setup

This MFE has been configured to work as a standalone custom element (Web Component).

## Building

Build the standalone custom element bundle:

```bash
# From workspace root
nx build-standalone mfe-summary

# Or from this directory
NODE_ENV=production npx vite build --config vite.config.standalone.ts --mode production
```

Output location: `dist/apps/mfe-summary/standalone/`

## Testing Locally

1. Build the standalone bundle
2. Copy files to public folder:
   ```bash
   cp dist/apps/mfe-summary/standalone/custom-element.* apps/mfe-summary/public/
   ```
3. Start dev server:
   ```bash
   nx serve mfe-summary
   ```
4. Open: `http://localhost:PORT/test-custom-element.html`

## Usage in HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/custom-element.css">
</head>
<body>
  <mfe-summary
    theme="light"
    user-id="123">
  </mfe-summary>

  <script type="module" src="path/to/custom-element.mjs"></script>
</body>
</html>
```

## Attributes

- `theme`: 'light' or 'dark'
- `user-id`: User ID string
- (Add more attributes as needed in `src/ce.tsx`)

## Events

The custom element emits these events:

- `component-update`: Fired when component data updates
  ```javascript
  document.addEventListener('component-update', (e) => {
    console.log('Updated:', e.detail);
  });
  ```

## Customization

Edit `src/ce.tsx` to:
- Add more attributes to `observedAttributes`
- Change component props
- Add more custom events
- Modify mount/unmount behavior

## Files

- `src/ce.tsx`: Custom element wrapper
- `vite.config.standalone.ts`: Standalone build configuration
- `public/test-custom-element.html`: Test page
