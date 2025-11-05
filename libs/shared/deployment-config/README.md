# Deployment Configuration

Shared utilities for managing environment-specific MFE URLs and deployment configuration.

## Features

- Environment-based URL resolution (local, staging, production)
- MFE remote entry URL generation
- Custom element URL generation
- S3 bucket name resolution
- Deployment manifest generation

## Usage

### Get MFE URL

```typescript
import { getMfeUrl } from '@hs-mono-repo/deployment-config';

// Get URL for local development
const localUrl = getMfeUrl('mfe-profile', 'local');
// Returns: http://localhost:4203/remoteEntry.js

// Get URL for production
const prodUrl = getMfeUrl('mfe-profile', 'production', '1.0.0');
// Returns: https://mfe.example.com/mfe-profile/1.0.0/remoteEntry.js
```

### Get All MFE Configs

```typescript
import { getAllMfeConfigs } from '@hs-mono-repo/deployment-config';

const mfes = getAllMfeConfigs('production', '1.0.0');
/*
{
  profile: {
    name: 'mfe_profile',
    url: 'https://mfe.example.com/mfe-profile/1.0.0/remoteEntry.js',
    entryFile: 'remoteEntry.js'
  },
  summary: { ... },
  documents: { ... }
}
*/
```

### Get Custom Element URL

```typescript
import { getCustomElementUrl } from '@hs-mono-repo/deployment-config';

const ceUrl = getCustomElementUrl('mfe-profile', 'production', '1.0.0');
// Returns: https://mfe.example.com/mfe-profile/1.0.0/ce.js
```

### Get S3 Bucket Name

```typescript
import { getS3BucketName } from '@hs-mono-repo/deployment-config';

const bucket = getS3BucketName('mfe-profile', 'production');
// Returns: hs-mono-repo-mfe-profile-prod
```

### Get Deployment Config

```typescript
import { getDeploymentConfig } from '@hs-mono-repo/deployment-config';

// Reads from environment variables
const config = getDeploymentConfig();
/*
{
  environment: 'production',
  version: '1.0.0',
  buildTime: '2025-01-15T10:30:00.000Z'
}
*/
```

## Environment Variables

- `VITE_ENVIRONMENT`: Target environment (local, staging, production)
- `VITE_VERSION`: Version to use (defaults to latest)
- `NODE_ENV`: Node environment
- `npm_package_version`: Package version from package.json

## Configuration

Edit `src/index.ts` to update:

- Environment URLs
- MFE port mappings
- S3 bucket names
