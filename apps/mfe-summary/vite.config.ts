/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { federation } from '@module-federation/vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/mfe-summary',
  server: {
    port: 4204,
    host: 'localhost',
    fs: {
      allow: ['../..'],
    },
  },
  preview: {
    port: 4204,
    host: 'localhost',
  },
  plugins: [
    federation({
      name: 'mfe_summary',
      filename: 'remoteEntry.js',
      exposes: {
        './SummaryPage': './src/components/SummaryPage.tsx',
        './bootstrap': './src/bootstrap.tsx',
        './customElement': './src/ce.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
      },
    }),
    react(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../../dist/apps/mfe-summary',
    emptyOutDir: true,
    reportCompressedSize: true,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'mfe-summary',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/mfe-summary',
      provider: 'v8' as const,
    },
  },
}));
