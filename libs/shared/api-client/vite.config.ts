/// <reference types='vitest' />
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { join } from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/libs/shared/api-client',

  plugins: [nxViteTsPaths()],

  // Library mode configuration
  build: {
    outDir: join(__dirname, '../../../dist/libs/shared/api-client'),
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      entry: join(__dirname, 'src/index.ts'),
      name: 'SharedApiClient',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@tanstack/react-query'],
    },
  },

  test: {
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../coverage/libs/shared/api-client',
      provider: 'v8',
    },
  },
});
