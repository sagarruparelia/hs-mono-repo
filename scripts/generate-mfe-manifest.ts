#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ExposedModule {
  path: string;
  description: string;
  type: 'component' | 'bootstrap' | 'custom-element';
}

interface MFEManifest {
  name: string;
  version: string;
  remoteEntry: string;
  exposedModules: Record<string, ExposedModule>;
  shared: string[];
  environment: string;
  deployedAt: string;
  checksum?: string;
}

interface MFEConfig {
  name: string;
  displayName: string;
  exposedModules: Record<string, ExposedModule>;
  shared: string[];
}

const MFE_CONFIGS: Record<string, MFEConfig> = {
  'mfe-profile': {
    name: 'mfe_profile',
    displayName: 'Profile MFE',
    exposedModules: {
      'ProfilePage': {
        path: './ProfilePage',
        description: 'Standalone profile page component - no router required',
        type: 'component',
      },
      'ProfilePageWithRouter': {
        path: './ProfilePageWithRouter',
        description: 'Profile page with TanStack Router integration',
        type: 'component',
      },
      'bootstrap': {
        path: './bootstrap',
        description: 'Full application bootstrap with routing and providers',
        type: 'bootstrap',
      },
      'customElement': {
        path: './customElement',
        description: 'Web Component version (framework-agnostic, works in any app)',
        type: 'custom-element',
      },
    },
    shared: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
  },
  'mfe-summary': {
    name: 'mfe_summary',
    displayName: 'Summary MFE',
    exposedModules: {
      'SummaryPage': {
        path: './SummaryPage',
        description: 'Standalone summary page component - no router required',
        type: 'component',
      },
      'SummaryPageWithRouter': {
        path: './SummaryPageWithRouter',
        description: 'Summary page with TanStack Router integration',
        type: 'component',
      },
      'bootstrap': {
        path: './bootstrap',
        description: 'Full application bootstrap with routing and providers',
        type: 'bootstrap',
      },
      'customElement': {
        path: './customElement',
        description: 'Web Component version (framework-agnostic, works in any app)',
        type: 'custom-element',
      },
    },
    shared: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-router'],
  },
  'mfe-documents': {
    name: 'mfe_documents',
    displayName: 'Documents MFE',
    exposedModules: {
      'DocumentsPage': {
        path: './DocumentsPage',
        description: 'Standalone documents page component - no router required',
        type: 'component',
      },
      'bootstrap': {
        path: './bootstrap',
        description: 'Full application bootstrap with routing and providers',
        type: 'bootstrap',
      },
    },
    shared: ['react', 'react-dom', '@tanstack/react-query'],
  },
};

function calculateChecksum(distPath: string): string {
  try {
    const remoteEntryPath = path.join(distPath, 'remoteEntry.js');
    if (fs.existsSync(remoteEntryPath)) {
      const content = fs.readFileSync(remoteEntryPath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    }
  } catch (error) {
    console.warn(`Warning: Could not calculate checksum: ${error}`);
  }
  return '';
}

function generateManifest(
  mfeName: string,
  version: string,
  environment: string,
  cdnUrl: string,
  distPath?: string
): MFEManifest {
  const config = MFE_CONFIGS[mfeName];
  if (!config) {
    throw new Error(`Unknown MFE: ${mfeName}. Available: ${Object.keys(MFE_CONFIGS).join(', ')}`);
  }

  const baseUrl = `${cdnUrl}/${mfeName}/${version}`;
  const checksum = distPath ? calculateChecksum(distPath) : undefined;

  return {
    name: config.name,
    version,
    remoteEntry: `${baseUrl}/remoteEntry.js`,
    exposedModules: config.exposedModules,
    shared: config.shared,
    environment,
    deployedAt: new Date().toISOString(),
    ...(checksum && { checksum }),
  };
}

function generateTypeDefinitions(mfeName: string): string {
  const config = MFE_CONFIGS[mfeName];
  if (!config) {
    throw new Error(`Unknown MFE: ${mfeName}`);
  }

  const moduleName = config.name;
  let types = `// Type definitions for ${config.displayName}\n`;
  types += `// Generated: ${new Date().toISOString()}\n\n`;

  Object.entries(config.exposedModules).forEach(([key, module]) => {
    if (module.type === 'component') {
      types += `declare module '${moduleName}/${key}' {\n`;
      types += `  import { FC } from 'react';\n`;
      types += `  const ${key}: FC;\n`;
      types += `  export default ${key};\n`;
      types += `}\n\n`;
    } else if (module.type === 'bootstrap') {
      types += `declare module '${moduleName}/${key}' {\n`;
      types += `  export function bootstrap(): Promise<void>;\n`;
      types += `}\n\n`;
    } else if (module.type === 'custom-element') {
      types += `declare module '${moduleName}/${key}' {\n`;
      types += `  export function register(): void;\n`;
      types += `}\n\n`;
    }
  });

  return types;
}

// CLI execution
function main() {
  const [, , mfeName, version, environment, cdnUrl, distPath] = process.argv;

  if (!mfeName || !version || !environment) {
    console.error('Usage: generate-mfe-manifest.ts <mfe-name> <version> <environment> [cdnUrl] [distPath]');
    console.error('\nAvailable MFEs:');
    Object.keys(MFE_CONFIGS).forEach((key) => {
      console.error(`  - ${key}`);
    });
    process.exit(1);
  }

  try {
    const manifest = generateManifest(
      mfeName,
      version,
      environment,
      cdnUrl || 'https://cdn.example.com',
      distPath
    );

    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Export for use as module
export { generateManifest, generateTypeDefinitions, MFE_CONFIGS };

// Run if executed directly
if (require.main === module) {
  main();
}
