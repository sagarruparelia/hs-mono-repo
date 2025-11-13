#!/bin/bash
set -e

# Deploy MFE for External Consumers
# Usage: ./scripts/deploy-mfe-external.sh <mfe-name> <version> <environment>
# Example: ./scripts/deploy-mfe-external.sh mfe-profile 1.0.0 production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

# Check arguments
if [ $# -lt 3 ]; then
    print_error "Usage: $0 <mfe-name> <version> <environment>"
    print_info "MFE Names: mfe-profile, mfe-summary, mfe-documents"
    print_info "Example: $0 mfe-profile 1.0.0 production"
    exit 1
fi

MFE_NAME=$1
VERSION=$2
ENVIRONMENT=$3
CDN_URL=${CDN_URL:-"https://cdn.example.com"}
WORKSPACE_ROOT=$(pwd)

# Validate MFE name
case $MFE_NAME in
    mfe-profile|mfe-summary|mfe-documents)
        ;;
    *)
        print_error "Invalid MFE name. Must be: mfe-profile, mfe-summary, or mfe-documents"
        exit 1
        ;;
esac

# Validate environment
case $ENVIRONMENT in
    staging|production)
        ;;
    *)
        print_error "Invalid environment. Must be: staging or production"
        exit 1
        ;;
esac

# Set S3 bucket based on environment
if [ "$ENVIRONMENT" == "production" ]; then
    S3_BUCKET=${S3_BUCKET_PROD:-"hs-mfe-production"}
    CLOUDFRONT_ID="${CLOUDFRONT_MFE_PROD_ID}"
else
    S3_BUCKET=${S3_BUCKET_STAGING:-"hs-mfe-staging"}
    CLOUDFRONT_ID="${CLOUDFRONT_MFE_STAGING_ID}"
fi

DIST_PATH="dist/apps/${MFE_NAME}"

print_step "🚀 Starting deployment: ${MFE_NAME} v${VERSION} to ${ENVIRONMENT}"
echo ""

# Step 1: Build the MFE
print_step "📦 Step 1/8: Building ${MFE_NAME}..."
export VITE_CDN_URL=$CDN_URL
export VITE_MFE_VERSION=$VERSION

# Use production config if it exists
if [ -f "apps/${MFE_NAME}/vite.config.production.ts" ]; then
    print_info "Using production vite config"
    npx nx build ${MFE_NAME} --configuration=production --configFile=vite.config.production.ts
else
    print_warning "Production vite config not found, using default"
    npx nx build ${MFE_NAME} --configuration=production
fi

if [ ! -d "$DIST_PATH" ]; then
    print_error "Build failed. Directory $DIST_PATH does not exist."
    exit 1
fi

print_info "✓ Build completed successfully"
echo ""

# Step 2: Generate manifest
print_step "📝 Step 2/8: Generating manifest..."
npx tsx scripts/generate-mfe-manifest.ts \
  ${MFE_NAME} \
  ${VERSION} \
  ${ENVIRONMENT} \
  ${CDN_URL} \
  ${DIST_PATH} \
  > ${DIST_PATH}/manifest.json

print_info "✓ Manifest generated"
cat ${DIST_PATH}/manifest.json | jq '.'
echo ""

# Step 3: Generate TypeScript definitions
print_step "📘 Step 3/8: Generating TypeScript definitions..."
cat > ${DIST_PATH}/types.d.ts <<EOF
// Type definitions for ${MFE_NAME}
// Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
// Version: ${VERSION}

EOF

# Generate type definitions based on MFE
if [ "$MFE_NAME" == "mfe-profile" ]; then
cat >> ${DIST_PATH}/types.d.ts <<'EOF'
declare module 'mfe_profile/ProfilePage' {
  import { FC } from 'react';
  const ProfilePage: FC;
  export default ProfilePage;
}

declare module 'mfe_profile/ProfilePageWithRouter' {
  import { FC } from 'react';
  const ProfilePageWithRouter: FC;
  export default ProfilePageWithRouter;
}

declare module 'mfe_profile/bootstrap' {
  export function bootstrap(): Promise<void>;
}

declare module 'mfe_profile/customElement' {
  export function register(): void;
}
EOF
elif [ "$MFE_NAME" == "mfe-summary" ]; then
cat >> ${DIST_PATH}/types.d.ts <<'EOF'
declare module 'mfe_summary/SummaryPage' {
  import { FC } from 'react';
  const SummaryPage: FC;
  export default SummaryPage;
}

declare module 'mfe_summary/SummaryPageWithRouter' {
  import { FC } from 'react';
  const SummaryPageWithRouter: FC;
  export default SummaryPageWithRouter;
}

declare module 'mfe_summary/bootstrap' {
  export function bootstrap(): Promise<void>;
}

declare module 'mfe_summary/customElement' {
  export function register(): void;
}
EOF
fi

print_info "✓ TypeScript definitions generated"
echo ""

# Step 4: Create integration guide
print_step "📖 Step 4/8: Creating integration guide..."
MANIFEST_JSON=$(cat ${DIST_PATH}/manifest.json)
cat > ${DIST_PATH}/INTEGRATION.md <<EOF
# ${MFE_NAME} Integration Guide

**Version:** ${VERSION}
**Environment:** ${ENVIRONMENT}
**Deployed:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Quick Links

- 📦 Remote Entry: [\`${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js\`](${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js)
- 📋 Manifest: [\`${CDN_URL}/${MFE_NAME}/${VERSION}/manifest.json\`](${CDN_URL}/${MFE_NAME}/${VERSION}/manifest.json)
- 📘 Types: [\`${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts\`](${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts)

## Integration Methods

### Method 1: Module Federation (React + Vite)

Best for: React applications using Vite and Module Federation.

\`\`\`typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    federation({
      name: 'host_app',
      remotes: {
        ${MFE_NAME}: {
          type: 'module',
          name: '$(echo $MFE_NAME | sed 's/-/_/g')',
          entry: '${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js',
          entryGlobalName: '$(echo $MFE_NAME | sed 's/-/_/g')',
          shareScope: 'default',
        }
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@tanstack/react-query': { singleton: true },
        '@tanstack/react-router': { singleton: true },
      }
    }),
    react(),
  ]
});
\`\`\`

\`\`\`tsx
// App.tsx
import { lazy, Suspense } from 'react';

// Import MFE components
const ProfilePage = lazy(() => import('$(echo $MFE_NAME | sed 's/-/_/g')/ProfilePage'));

function App() {
  return (
    <div>
      <h1>Host Application</h1>
      <Suspense fallback={<div>Loading MFE...</div>}>
        <ProfilePage />
      </Suspense>
    </div>
  );
}

export default App;
\`\`\`

### Method 2: Web Components (Framework Agnostic)

Best for: Any web application (vanilla JS, Angular, Vue, etc.)

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MFE Integration Example</title>
</head>
<body>
  <h1>Host Application</h1>

  <!-- The custom element will be rendered here -->
  <div id="mfe-container">
    <$(echo $MFE_NAME | sed 's/-/_/g')-component></$(echo $MFE_NAME | sed 's/-/_/g')-component>
  </div>

  <script type="module">
    // Load and register the custom element
    import('${CDN_URL}/${MFE_NAME}/${VERSION}/customElement.js')
      .then(module => {
        module.register();
        console.log('MFE custom element registered');
      })
      .catch(error => {
        console.error('Failed to load MFE:', error);
      });
  </script>
</body>
</html>
\`\`\`

### Method 3: Module Federation (Webpack)

Best for: React applications using Webpack Module Federation.

\`\`\`javascript
// webpack.config.js
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        $(echo $MFE_NAME | sed 's/-/_/g'): '$(echo $MFE_NAME | sed 's/-/_/g')@${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
};
\`\`\`

### Method 4: Dynamic Script Loading

Best for: Runtime loading without build-time configuration.

\`\`\`typescript
// mfe-loader.ts
export async function loadMFE(mfeName: string, version: string = 'latest') {
  const cdnUrl = '${CDN_URL}';
  const scriptUrl = \`\${cdnUrl}/\${mfeName}/\${version}/remoteEntry.js\`;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'module';
    script.onload = () => {
      const container = window[\`\${mfeName.replace(/-/g, '_')}\`];
      resolve(container);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Usage
loadMFE('${MFE_NAME}', '${VERSION}')
  .then(container => {
    console.log('MFE loaded:', container);
    // Use the MFE...
  })
  .catch(error => {
    console.error('Failed to load MFE:', error);
  });
\`\`\`

## Available Modules

$(echo "$MANIFEST_JSON" | jq -r '.exposedModules | to_entries[] | "- **\(.key)**: \(.value.description) (\(.value.type))"')

## Shared Dependencies

This MFE expects the host application to provide these shared dependencies:

$(echo "$MANIFEST_JSON" | jq -r '.shared[] | "- \(.)"')

## Version Management

### Using Latest Version

\`\`\`typescript
// Always use the latest deployed version
entry: '${CDN_URL}/${MFE_NAME}/latest/remoteEntry.js'
\`\`\`

### Pinning to Specific Version

\`\`\`typescript
// Pin to a specific version for stability
entry: '${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js'
\`\`\`

### Dynamic Version Selection

\`\`\`typescript
// Fetch manifest and decide which version to use
const manifest = await fetch('${CDN_URL}/${MFE_NAME}/latest/manifest.json')
  .then(res => res.json());

console.log('Using version:', manifest.version);
// Load based on manifest.remoteEntry
\`\`\`

## TypeScript Support

Add type definitions to your project:

\`\`\`bash
# Download type definitions
curl -o src/types/${MFE_NAME}.d.ts ${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts
\`\`\`

Or reference directly in your \`tsconfig.json\`:

\`\`\`json
{
  "compilerOptions": {
    "types": ["${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts"]
  }
}
\`\`\`

## Security

### Content Security Policy (CSP)

Add these directives to your CSP:

\`\`\`
Content-Security-Policy:
  script-src 'self' ${CDN_URL};
  connect-src 'self' ${CDN_URL};
  style-src 'self' 'unsafe-inline' ${CDN_URL};
\`\`\`

### Subresource Integrity (SRI)

For critical deployments, verify the integrity:

\`\`\`typescript
const manifest = await fetch('${CDN_URL}/${MFE_NAME}/${VERSION}/manifest.json')
  .then(res => res.json());

console.log('Expected checksum:', manifest.checksum);
// Verify checksum before loading
\`\`\`

## Troubleshooting

### CORS Issues

Ensure your application domain is allowed. Contact support if you encounter CORS errors.

### Version Conflicts

If you see version conflict warnings, ensure shared dependencies match:
- React: ^19.0.0
- React DOM: ^19.0.0
- TanStack Query: ^5.0.0
- TanStack Router: ^1.0.0

### Loading Failures

Check:
1. Network connectivity to CDN
2. Console for error messages
3. Browser DevTools Network tab
4. CSP headers aren't blocking the MFE

## Support

- **Documentation:** See main repository README
- **Issues:** Open an issue in the repository
- **Version:** ${VERSION}
- **Environment:** ${ENVIRONMENT}
- **Deployed:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

---

*This guide was auto-generated during deployment.*
EOF

print_info "✓ Integration guide created"
echo ""

# Step 5: Upload to S3 with versioning
print_step "☁️  Step 5/8: Uploading to S3..."
print_info "Bucket: s3://${S3_BUCKET}"
print_info "Path: ${MFE_NAME}/${VERSION}/"

# Upload static assets with long cache (1 year)
aws s3 sync "${DIST_PATH}/" "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "remoteEntry.js" \
    --exclude "manifest.json" \
    --exclude "*.html" \
    --exclude "INTEGRATION.md"

# Upload remoteEntry.js with short cache (5 minutes)
aws s3 cp "${DIST_PATH}/remoteEntry.js" \
    "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/remoteEntry.js" \
    --cache-control "public, max-age=300, must-revalidate" \
    --content-type "application/javascript"

# Upload manifest with no cache
aws s3 cp "${DIST_PATH}/manifest.json" \
    "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/manifest.json" \
    --cache-control "no-cache, must-revalidate" \
    --content-type "application/json"

# Upload integration guide
aws s3 cp "${DIST_PATH}/INTEGRATION.md" \
    "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/INTEGRATION.md" \
    --cache-control "public, max-age=3600" \
    --content-type "text/markdown"

# Upload type definitions
aws s3 cp "${DIST_PATH}/types.d.ts" \
    "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/types.d.ts" \
    --cache-control "public, max-age=31536000, immutable" \
    --content-type "text/plain"

print_info "✓ Files uploaded successfully"
echo ""

# Step 6: Update 'latest' pointer
print_step "🔗 Step 6/8: Updating 'latest' pointer..."

# Create version pointer file
echo "${VERSION}" | aws s3 cp - "s3://${S3_BUCKET}/${MFE_NAME}/latest.txt" \
    --cache-control "no-cache, must-revalidate" \
    --content-type "text/plain"

# Sync version to latest directory
aws s3 sync "s3://${S3_BUCKET}/${MFE_NAME}/${VERSION}/" \
    "s3://${S3_BUCKET}/${MFE_NAME}/latest/" \
    --delete

print_info "✓ 'latest' pointer updated to ${VERSION}"
echo ""

# Step 7: Update global MFE registry
print_step "📋 Step 7/8: Updating global MFE registry..."

cat > /tmp/mfe-${MFE_NAME}-registry.json <<EOF
{
  "mfeName": "${MFE_NAME}",
  "latestVersion": "${VERSION}",
  "manifestUrl": "${CDN_URL}/${MFE_NAME}/${VERSION}/manifest.json",
  "remoteEntry": "${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js",
  "typesUrl": "${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts",
  "integrationGuideUrl": "${CDN_URL}/${MFE_NAME}/${VERSION}/INTEGRATION.md",
  "environment": "${ENVIRONMENT}",
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

aws s3 cp /tmp/mfe-${MFE_NAME}-registry.json \
    "s3://${S3_BUCKET}/registry/${MFE_NAME}.json" \
    --cache-control "no-cache, must-revalidate" \
    --content-type "application/json"

print_info "✓ Registry updated"
echo ""

# Step 8: Invalidate CloudFront cache
print_step "🔄 Step 8/8: Invalidating CloudFront cache..."

if [ -n "$CLOUDFRONT_ID" ]; then
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths \
            "/${MFE_NAME}/${VERSION}/*" \
            "/${MFE_NAME}/latest/*" \
            "/${MFE_NAME}/latest.txt" \
            "/registry/${MFE_NAME}.json" \
        --query 'Invalidation.Id' \
        --output text)

    print_info "✓ CloudFront invalidation created: $INVALIDATION_ID"

    if [ "${WAIT_FOR_INVALIDATION:-false}" == "true" ]; then
        print_info "Waiting for invalidation to complete..."
        aws cloudfront wait invalidation-completed \
            --distribution-id "$CLOUDFRONT_ID" \
            --id "$INVALIDATION_ID"
        print_info "✓ Invalidation completed"
    fi
else
    print_warning "CloudFront distribution ID not set. Skipping cache invalidation."
    print_info "Set CLOUDFRONT_MFE_${ENVIRONMENT^^}_ID environment variable to enable."
fi

echo ""

# Summary
echo "═══════════════════════════════════════════════════"
print_info "🎉 Deployment Summary"
echo "═══════════════════════════════════════════════════"
print_info "MFE:           ${MFE_NAME}"
print_info "Version:       ${VERSION}"
print_info "Environment:   ${ENVIRONMENT}"
print_info "S3 Bucket:     ${S3_BUCKET}"
echo ""
print_info "📦 URLs:"
print_info "  Remote Entry:  ${CDN_URL}/${MFE_NAME}/${VERSION}/remoteEntry.js"
print_info "  Latest:        ${CDN_URL}/${MFE_NAME}/latest/remoteEntry.js"
print_info "  Manifest:      ${CDN_URL}/${MFE_NAME}/${VERSION}/manifest.json"
print_info "  Types:         ${CDN_URL}/${MFE_NAME}/${VERSION}/types.d.ts"
print_info "  Integration:   ${CDN_URL}/${MFE_NAME}/${VERSION}/INTEGRATION.md"
echo "═══════════════════════════════════════════════════"
echo ""
print_info "✅ Deployment completed successfully!"
