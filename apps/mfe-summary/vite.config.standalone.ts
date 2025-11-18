/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Standalone build config - NO Module Federation
// This creates a simple bundle that can be loaded directly
export default defineConfig(({ mode }) => ({
  mode: 'production',
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/mfe-summary',
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
    outDir: '../../dist/apps/mfe-summary/standalone',
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
