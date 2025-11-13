/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { federation } from '@module-federation/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const CDN_URL = env.VITE_CDN_URL || 'https://cdn.example.com';
  const VERSION = env.VITE_MFE_VERSION || 'latest';

  return {
    root: __dirname,
    base: `${CDN_URL}/mfe-summary/${VERSION}/`,
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
          './SummaryPageWithRouter': './src/components/SummaryPageWithRouter.tsx',
          './bootstrap': './src/bootstrap.tsx',
          './customElement': './src/ce.tsx',
        },
        shared: {
          react: {
            singleton: true,
            requiredVersion: '^19.0.0',
            eager: false,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: '^19.0.0',
            eager: false,
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: '^5.0.0',
            eager: false,
          },
          '@tanstack/react-router': {
            singleton: true,
            requiredVersion: '^1.0.0',
            eager: false,
          },
        },
      }),
      react(),
      nxViteTsPaths(),
      nxCopyAssetsPlugin(['*.md']),
    ],
    build: {
      outDir: '../../dist/apps/mfe-summary',
      emptyOutDir: true,
      reportCompressedSize: true,
      target: 'esnext',
      minify: 'esbuild',
      cssCodeSplit: false,
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
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
  };
});
