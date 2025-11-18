#!/bin/bash

# Setup Custom Element for MFE
# Usage: ./scripts/setup-custom-element.sh <mfe-name> <component-name> <custom-element-tag>
# Example: ./scripts/setup-custom-element.sh mfe-profile ProfilePage mfe-profile

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <mfe-name> <component-name> <custom-element-tag>"
    echo "Example: $0 mfe-profile ProfilePage mfe-profile"
    exit 1
fi

MFE_NAME=$1
COMPONENT_NAME=$2
CUSTOM_ELEMENT_TAG=$3
MFE_PATH="apps/${MFE_NAME}"

# Check if MFE exists
if [ ! -d "$MFE_PATH" ]; then
    echo "Error: MFE directory $MFE_PATH does not exist"
    exit 1
fi

echo -e "${BLUE}Setting up custom element for ${MFE_NAME}...${NC}"

# 1. Create custom element wrapper (ce.tsx)
echo -e "${YELLOW}[1/5] Creating custom element wrapper...${NC}"
cat > "${MFE_PATH}/src/ce.tsx" << 'EOF'
/**
 * Custom Element (Web Component) wrapper
 * Auto-generated - customize as needed
 */

import { createRoot, Root } from 'react-dom/client';
import COMPONENT_NAME from './components/COMPONENT_NAME';

class COMPONENT_NAMEElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'theme',
      'user-id',
      // Add your custom attributes here
    ];
  }

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.mount();
    }
  }

  private mount() {
    const theme = (this.getAttribute('theme') as 'light' | 'dark') || 'light';
    const userId = this.getAttribute('user-id') || '';

    if (!this.root) {
      this.root = createRoot(this);
    }

    this.root.render(
      <COMPONENT_NAME
        theme={theme}
        userId={userId}
        onUpdate={(data) => {
          this.dispatchEvent(
            new CustomEvent('component-update', {
              detail: data,
              bubbles: true,
              composed: true,
            })
          );
        }}
      />
    );
  }

  private unmount() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// Register the custom element
if (!customElements.get('CUSTOM_ELEMENT_TAG')) {
  customElements.define('CUSTOM_ELEMENT_TAG', COMPONENT_NAMEElement);
}

export { COMPONENT_NAMEElement };
EOF

# Replace placeholders
sed -i '' "s/COMPONENT_NAME/${COMPONENT_NAME}/g" "${MFE_PATH}/src/ce.tsx"
sed -i '' "s/CUSTOM_ELEMENT_TAG/${CUSTOM_ELEMENT_TAG}/g" "${MFE_PATH}/src/ce.tsx"

echo -e "${GREEN}✓ Created ${MFE_PATH}/src/ce.tsx${NC}"

# 2. Create standalone vite config
echo -e "${YELLOW}[2/5] Creating standalone Vite config...${NC}"
cat > "${MFE_PATH}/vite.config.standalone.ts" << 'EOF'
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Standalone build config - NO Module Federation
// This creates a simple bundle that can be loaded directly
export default defineConfig(({ mode }) => ({
  mode: 'production',
  root: __dirname,
  cacheDir: '../../node_modules/.vite/MFE_PATH_PLACEHOLDER',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
    react({
      // Force production JSX runtime
      jsxImportSource: undefined,
    }),
    nxViteTsPaths(),
  ],
  build: {
    outDir: '../../dist/MFE_PATH_PLACEHOLDER/standalone',
    emptyOutDir: true,
    minify: false, // Don't minify for easier debugging
    lib: {
      entry: 'src/ce.tsx',
      formats: ['es'],
      fileName: 'custom-element',
    },
    rollupOptions: {
      // Don't externalize anything - bundle everything
      external: [],
    },
  },
}));
EOF

sed -i '' "s|MFE_PATH_PLACEHOLDER|${MFE_PATH}|g" "${MFE_PATH}/vite.config.standalone.ts"

echo -e "${GREEN}✓ Created ${MFE_PATH}/vite.config.standalone.ts${NC}"

# 3. Add build-standalone target to project.json
echo -e "${YELLOW}[3/5] Adding build-standalone target to project.json...${NC}"

# Check if project.json exists
if [ ! -f "${MFE_PATH}/project.json" ]; then
    echo -e "${YELLOW}Warning: project.json not found, skipping...${NC}"
else
    # Use Node.js to safely add the target
    node -e "
    const fs = require('fs');
    const path = '${MFE_PATH}/project.json';
    const config = JSON.parse(fs.readFileSync(path, 'utf8'));

    if (!config.targets) config.targets = {};

    config.targets['build-standalone'] = {
      executor: 'nx:run-commands',
      options: {
        command: 'NODE_ENV=production vite build --config vite.config.standalone.ts --mode production',
        cwd: '${MFE_PATH}'
      },
      cache: true,
      outputs: ['{workspaceRoot}/dist/${MFE_PATH}/standalone']
    };

    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    "
    echo -e "${GREEN}✓ Added build-standalone target to project.json${NC}"
fi

# 4. Create test HTML file
echo -e "${YELLOW}[4/5] Creating test HTML file...${NC}"
cat > "${MFE_PATH}/public/test-custom-element.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CUSTOM_ELEMENT_TAG Test</title>
  <link rel="stylesheet" href="/custom-element.css">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      background: #e8f5e9;
      color: #2e7d32;
    }
  </style>
</head>
<body>
  <h1>CUSTOM_ELEMENT_TAG Custom Element Test</h1>

  <div class="status">
    ✓ Using standalone bundle (no Module Federation conflicts)
  </div>

  <!-- The custom element -->
  <CUSTOM_ELEMENT_TAG
    theme="light"
    user-id="12345">
  </CUSTOM_ELEMENT_TAG>

  <!-- Load the standalone bundle -->
  <script type="module" src="/custom-element.mjs"></script>

  <script>
    console.log('Page loaded, custom element script loading...');

    // Check if it registered
    setTimeout(() => {
      if (customElements.get('CUSTOM_ELEMENT_TAG')) {
        console.log('✓ Custom element registered successfully!');
      } else {
        console.error('✗ Custom element not registered');
      }
    }, 1000);

    // Listen for events
    document.addEventListener('component-update', (e) => {
      console.log('Component updated:', e.detail);
    });
  </script>
</body>
</html>
EOF

sed -i '' "s/CUSTOM_ELEMENT_TAG/${CUSTOM_ELEMENT_TAG}/g" "${MFE_PATH}/public/test-custom-element.html"

echo -e "${GREEN}✓ Created ${MFE_PATH}/public/test-custom-element.html${NC}"

# 5. Create README
echo -e "${YELLOW}[5/5] Creating README...${NC}"
cat > "${MFE_PATH}/CUSTOM_ELEMENT.md" << 'EOF'
# Custom Element Setup

This MFE has been configured to work as a standalone custom element (Web Component).

## Building

Build the standalone custom element bundle:

```bash
# From workspace root
nx build-standalone MFE_NAME

# Or from this directory
NODE_ENV=production npx vite build --config vite.config.standalone.ts --mode production
```

Output location: `dist/MFE_PATH/standalone/`

## Testing Locally

1. Build the standalone bundle
2. Copy files to public folder:
   ```bash
   cp dist/MFE_PATH/standalone/custom-element.* MFE_PATH/public/
   ```
3. Start dev server:
   ```bash
   nx serve MFE_NAME
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
  <CUSTOM_ELEMENT_TAG
    theme="light"
    user-id="123">
  </CUSTOM_ELEMENT_TAG>

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
EOF

sed -i '' "s/MFE_NAME/${MFE_NAME}/g" "${MFE_PATH}/CUSTOM_ELEMENT.md"
sed -i '' "s|MFE_PATH|${MFE_PATH}|g" "${MFE_PATH}/CUSTOM_ELEMENT.md"
sed -i '' "s/CUSTOM_ELEMENT_TAG/${CUSTOM_ELEMENT_TAG}/g" "${MFE_PATH}/CUSTOM_ELEMENT.md"

echo -e "${GREEN}✓ Created ${MFE_PATH}/CUSTOM_ELEMENT.md${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Custom element setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Review and customize: ${MFE_PATH}/src/ce.tsx"
echo "   - Update component props"
echo "   - Add/modify attributes"
echo "   - Customize events"
echo ""
echo "2. Build the standalone bundle:"
echo -e "   ${YELLOW}nx build-standalone ${MFE_NAME}${NC}"
echo ""
echo "3. Test locally:"
echo -e "   ${YELLOW}cp dist/${MFE_PATH}/standalone/custom-element.* ${MFE_PATH}/public/${NC}"
echo -e "   ${YELLOW}nx serve ${MFE_NAME}${NC}"
echo -e "   Open: ${BLUE}http://localhost:PORT/test-custom-element.html${NC}"
echo ""
echo "4. Read the guide: ${MFE_PATH}/CUSTOM_ELEMENT.md"
echo ""
