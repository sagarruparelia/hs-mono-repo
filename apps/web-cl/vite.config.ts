/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { federation } from '@module-federation/vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/web-cl',
  server: {
    port: 4202,
    host: 'localhost',
    fs: {
      allow: ['../..'],
    },
  },
  preview: {
    port: 4202,
    host: 'localhost',
  },
  plugins: [
    federation({
      name: 'web_cl',
      remotes: {
        mfe_profile: {
          type: 'module',
          name: 'mfe_profile',
          entry: 'http://localhost:4203/remoteEntry.js',
          entryGlobalName: 'mfe_profile',
          shareScope: 'default',
        },
        mfe_summary: {
          type: 'module',
          name: 'mfe_summary',
          entry: 'http://localhost:4204/remoteEntry.js',
          entryGlobalName: 'mfe_summary',
          shareScope: 'default',
        },
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
        'react-router': {
          singleton: true,
          requiredVersion: '^7.0.0',
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
    outDir: '../../dist/apps/web-cl',
    emptyOutDir: true,
    reportCompressedSize: true,
    target: 'esnext',
    minify: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: 'web-cl',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web-cl',
      provider: 'v8' as const,
    },
  },
}));
