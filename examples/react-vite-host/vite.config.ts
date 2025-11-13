import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'host_app',
      remotes: {
        mfe_profile: {
          type: 'module',
          name: 'mfe_profile',
          entry: 'https://cdn.example.com/mfe-profile/latest/remoteEntry.js',
          entryGlobalName: 'mfe_profile',
          shareScope: 'default',
        },
        mfe_summary: {
          type: 'module',
          name: 'mfe_summary',
          entry: 'https://cdn.example.com/mfe-summary/latest/remoteEntry.js',
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
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
        },
        '@tanstack/react-router': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
      },
    }),
    react(),
  ],
  server: {
    port: 3000,
    open: true,
  },
});
