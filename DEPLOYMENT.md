# Deployment Guide

This guide covers the deployment process for web-cl and all MFEs (Micro Frontends) in the hs-mono-repo.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Custom Element URLs](#custom-element-urls)
- [CI/CD Pipeline](#cicd-pipeline)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

### Applications

- **web-cl** (Port 4202): Main shell application for CL
- **web-hs** (Port 4201): Main shell application for HS
- **mfe-profile** (Port 4203): Profile micro-frontend
- **mfe-summary** (Port 4204): Summary micro-frontend
- **mfe-documents** (Port 4205): Documents micro-frontend

### Deployment Strategy

The deployment uses a versioned approach with three access patterns:

1. **Versioned**: `https://mfe.example.com/mfe-profile/abc123/remoteEntry.js`
2. **Latest**: `https://mfe.example.com/mfe-profile/latest/remoteEntry.js`
3. **Root**: `https://mfe.example.com/mfe-profile/remoteEntry.js`

## Environment Configuration

### Environments

1. **Local** - Development environment
   - MFE Base URL: `http://localhost`
   - API Base URL: `http://localhost:8080`

2. **Staging** - Pre-production environment
   - MFE Base URL: `https://staging-mfe.example.com`
   - API Base URL: `https://staging-api.example.com`

3. **Production** - Live environment
   - MFE Base URL: `https://mfe.example.com`
   - API Base URL: `https://api.example.com`

### Environment Variables

Set these environment variables before building:

```bash
# Required
VITE_ENVIRONMENT=staging|production
VITE_VERSION=1.0.0  # or git commit SHA

# AWS Credentials (for deployment)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# CloudFront Distribution IDs
CLOUDFRONT_DISTRIBUTION_ID_STAGING=E1234567890ABC
CLOUDFRONT_DISTRIBUTION_ID_PROD=E0987654321XYZ
```

## Deployment Process

### Automated Deployment (Recommended)

The deployment is automated through GitHub Actions:

1. **Push to `develop` branch** → Deploys to staging
2. **Push to `main` branch** → Deploys to production
3. **Manual trigger** → Deploy specific projects to any environment

### Build Process

All builds use environment-specific configuration:

```bash
# Build all projects for staging
VITE_ENVIRONMENT=staging npm run build

# Build specific project
VITE_ENVIRONMENT=production npm run build:web-cl
```

The build process:
1. Builds all MFE dependencies first
2. Configures Module Federation remotes based on environment
3. Generates optimized production bundles
4. Creates deployment manifests

## Custom Element URLs

MFEs can be consumed as Web Components using custom elements. Each MFE exposes a custom element script:

### URL Structure

```
https://mfe.example.com/{mfe-name}/{version}/ce.js
```

### Usage Example

```html
<!-- Load the custom element script -->
<script type="module" src="https://mfe.example.com/mfe-profile/latest/ce.js"></script>

<!-- Use the custom element -->
<mfe-profile
  theme="light"
  user-id-type="EID"
  user-id-value="12345"
  use-router="true">
</mfe-profile>
```

### Available Custom Elements

#### mfe-profile

```html
<mfe-profile
  theme="light|dark"
  user-id-type="EID"
  user-id-value="12345"
  logged-in-user-id-type="EID"
  logged-in-user-id-value="67890"
  route="/profile"
  use-router="true">
</mfe-profile>
```

#### mfe-documents

```html
<mfe-documents
  theme="light|dark"
  owner-id-type="EID"
  owner-id-value="12345"
  owner-display-name="John Doe"
  logged-in-user-id-type="EID"
  logged-in-user-id-value="67890"
  use-router="true">
</mfe-documents>
```

#### mfe-summary

```html
<mfe-summary
  theme="light|dark"
  user-id-type="EID"
  user-id-value="12345"
  use-router="true">
</mfe-summary>
```

### MFE Manifest

A manifest file is generated during deployment with all MFE URLs:

```bash
curl https://mfe.example.com/web-cl/mfe-manifest.json
```

Response:
```json
{
  "version": "abc123",
  "environment": "production",
  "mfes": {
    "profile": {
      "remoteEntry": "https://mfe.example.com/mfe-profile/abc123/remoteEntry.js",
      "customElement": "https://mfe.example.com/mfe-profile/abc123/ce.js",
      "latestRemoteEntry": "https://mfe.example.com/mfe-profile/latest/remoteEntry.js",
      "latestCustomElement": "https://mfe.example.com/mfe-profile/latest/ce.js",
      "customElementTag": "mfe-profile"
    }
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

Location: `.github/workflows/deploy.yml`

#### Workflow Steps

1. **Determine Affected Projects**
   - Uses Nx to detect changed projects
   - Only builds and deploys affected applications

2. **Lint & Test**
   - Runs ESLint on all projects
   - Executes unit tests with coverage
   - Uploads coverage reports to Codecov

3. **Build**
   - Builds all affected frontend projects in parallel
   - Includes environment-specific configuration
   - Generates deployment manifests

4. **Deploy to S3**
   - Uploads versioned files to S3
   - Updates "latest" pointer
   - Syncs to bucket root for default access
   - Sets appropriate cache headers

5. **CloudFront Invalidation**
   - Invalidates CDN cache for new files
   - Ensures users get latest version

6. **Generate MFE Manifest**
   - Creates manifest with all MFE URLs
   - Uploads to S3 for consumption by host apps

7. **Smoke Tests**
   - Validates deployment success
   - Tests all MFE endpoints
   - Checks API health

### Manual Deployment Trigger

You can manually trigger deployment from GitHub:

1. Go to **Actions** tab
2. Select **Deploy to AWS** workflow
3. Click **Run workflow**
4. Choose:
   - Environment: `staging` or `production`
   - Projects: `all`, `web-cl`, `mfe-profile`, etc.

## Manual Deployment

### Prerequisites

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
apt-get install awscli  # Linux

# Configure AWS credentials
aws configure

# Verify access
aws s3 ls
```

### Deploy Single MFE

```bash
# Deploy mfe-profile to staging
./scripts/deploy-mfe.sh mfe-profile 1.0.0 staging

# Deploy web-cl to production
./scripts/deploy-mfe.sh web-cl 1.0.0 production
```

### Deploy All Projects

```bash
# Build all projects
./scripts/build-all-mfes.sh production 1.0.0

# Deploy all
npm run deploy:all
```

### Generate MFE Manifest

```bash
./scripts/generate-mfe-manifest.sh production 1.0.0 dist/mfe-manifest.json
```

## S3 Bucket Structure

Each project has its own S3 bucket with the following structure:

```
hs-mono-repo-mfe-profile-prod/
├── abc123/                    # Versioned deployment (git SHA)
│   ├── remoteEntry.js
│   ├── ce.js
│   ├── assets/
│   └── deployment-manifest.json
├── latest/                     # Latest version pointer
│   ├── version.txt            # Contains current version SHA
│   ├── remoteEntry.js
│   └── ...
├── remoteEntry.js             # Root access (latest)
├── ce.js
└── assets/
```

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Cannot find module"

**Solution**: Ensure all dependencies are installed
```bash
npm ci
nx reset
npm run build
```

**Issue**: MFE remotes not loading

**Solution**: Check environment configuration
```bash
# Verify VITE_ENVIRONMENT is set correctly
echo $VITE_ENVIRONMENT

# Rebuild with correct environment
VITE_ENVIRONMENT=production npm run build:web-cl
```

### Deployment Issues

**Issue**: S3 upload fails with permission denied

**Solution**: Verify AWS credentials and bucket permissions
```bash
aws sts get-caller-identity
aws s3 ls s3://hs-mono-repo-mfe-profile-prod/
```

**Issue**: CloudFront still serving old version

**Solution**: Wait for invalidation to complete or create manual invalidation
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Runtime Issues

**Issue**: MFE fails to load in production

**Solution**: Check browser console for CORS or 404 errors
- Verify remoteEntry.js URL is correct
- Check S3 bucket CORS configuration
- Ensure CloudFront distribution is configured

**Issue**: Custom element not rendering

**Solution**:
1. Verify the custom element script is loaded
2. Check for JavaScript errors in console
3. Ensure correct attributes are passed
4. Verify the MFE version is deployed

### Cache Issues

**Issue**: Users seeing old version after deployment

**Solution**:
1. Verify CloudFront invalidation completed
2. Check cache headers on S3 objects
3. Force hard refresh in browser (Ctrl+Shift+R)

## Rollback Procedure

To rollback to a previous version:

1. **Identify the previous version SHA**
   ```bash
   git log --oneline
   ```

2. **Update the latest pointer**
   ```bash
   # Example: Rollback mfe-profile to version xyz789
   echo "xyz789" | aws s3 cp - s3://hs-mono-repo-mfe-profile-prod/latest/version.txt

   aws s3 sync s3://hs-mono-repo-mfe-profile-prod/xyz789/ \
     s3://hs-mono-repo-mfe-profile-prod/latest/ \
     --delete
   ```

3. **Invalidate CloudFront cache**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1234567890ABC \
     --paths "/latest/*" "/*"
   ```

## Best Practices

1. **Always test in staging first** before deploying to production
2. **Use versioned URLs** for production deployments
3. **Monitor CloudFront metrics** after deployment
4. **Keep deployment manifests** for audit trail
5. **Use semantic versioning** for releases
6. **Run smoke tests** after deployment
7. **Document breaking changes** in MFE APIs
8. **Maintain backward compatibility** when possible

## Support

For deployment issues or questions:
- Check this documentation first
- Review GitHub Actions logs
- Check CloudWatch logs for runtime errors
- Contact DevOps team for infrastructure issues
