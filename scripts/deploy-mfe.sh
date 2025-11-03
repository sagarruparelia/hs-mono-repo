#!/bin/bash

# Deploy Micro-Frontend to AWS S3
# Usage: ./scripts/deploy-mfe.sh <project> <version> <environment>
# Example: ./scripts/deploy-mfe.sh profile 1.0.0 production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check arguments
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <project> <version> [environment]"
    print_info "Projects: profile, summary, web-cl, web-hs"
    print_info "Example: $0 profile 1.0.0 production"
    exit 1
fi

PROJECT=$1
VERSION=$2
ENVIRONMENT=${3:-staging}

# Validate project
case $PROJECT in
    profile|summary|web-cl|web-hs)
        ;;
    *)
        print_error "Invalid project. Must be: profile, summary, web-cl, or web-hs"
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

# Set variables based on project
if [ "$PROJECT" == "profile" ]; then
    NX_PROJECT="mfe-profile"
    S3_BUCKET="hs-mono-repo-mfe-profile-${ENVIRONMENT}"
    DIST_PATH="dist/apps/mfe-profile"
elif [ "$PROJECT" == "summary" ]; then
    NX_PROJECT="mfe-summary"
    S3_BUCKET="hs-mono-repo-mfe-summary-${ENVIRONMENT}"
    DIST_PATH="dist/apps/mfe-summary"
elif [ "$PROJECT" == "web-cl" ]; then
    NX_PROJECT="web-cl"
    S3_BUCKET="hs-mono-repo-web-cl-${ENVIRONMENT}"
    DIST_PATH="dist/apps/web-cl"
else
    NX_PROJECT="web-hs"
    S3_BUCKET="hs-mono-repo-web-hs-${ENVIRONMENT}"
    DIST_PATH="dist/apps/web-hs"
fi

# Get CloudFront distribution ID
if [ "$ENVIRONMENT" == "production" ]; then
    CLOUDFRONT_ID=${CLOUDFRONT_DISTRIBUTION_ID_PROD:-}
else
    CLOUDFRONT_ID=${CLOUDFRONT_DISTRIBUTION_ID_STAGING:-}
fi

print_info "Starting deployment for ${NX_PROJECT} v${VERSION} to ${ENVIRONMENT}"

# Step 1: Build the project
print_info "Building ${NX_PROJECT}..."
npm run build:${PROJECT}

if [ ! -d "$DIST_PATH" ]; then
    print_error "Build failed. Directory $DIST_PATH does not exist."
    exit 1
fi

print_info "Build completed successfully"

# Step 2: Upload to S3 with versioning
print_info "Uploading to S3: s3://${S3_BUCKET}/v${VERSION}/"

# Upload static assets with long cache
aws s3 sync "${DIST_PATH}/" "s3://${S3_BUCKET}/v${VERSION}/" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.html" \
    --exclude "remoteEntry.js"

# Upload HTML files with shorter cache
aws s3 sync "${DIST_PATH}/" "s3://${S3_BUCKET}/v${VERSION}/" \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "index.html" \
    --include "*.html"

# Upload remoteEntry.js with short cache
aws s3 sync "${DIST_PATH}/" "s3://${S3_BUCKET}/v${VERSION}/" \
    --cache-control "public, max-age=300" \
    --include "remoteEntry.js"

print_info "Files uploaded to S3"

# Step 3: Update 'latest' symlink
print_info "Updating 'latest' to point to v${VERSION}..."

aws s3 sync "s3://${S3_BUCKET}/v${VERSION}/" "s3://${S3_BUCKET}/latest/" --delete

print_info "'latest' updated successfully"

# Step 4: Invalidate CloudFront cache
if [ -n "$CLOUDFRONT_ID" ]; then
    print_info "Invalidating CloudFront cache..."

    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$CLOUDFRONT_ID" \
        --paths "/*" "/v${VERSION}/*" "/latest/*" \
        --query 'Invalidation.Id' \
        --output text)

    print_info "CloudFront invalidation created: $INVALIDATION_ID"

    # Optionally wait for invalidation
    if [ "${WAIT_FOR_INVALIDATION:-false}" == "true" ]; then
        print_info "Waiting for CloudFront invalidation to complete..."
        aws cloudfront wait invalidation-completed \
            --distribution-id "$CLOUDFRONT_ID" \
            --id "$INVALIDATION_ID"
        print_info "CloudFront invalidation completed"
    fi
else
    print_warning "CloudFront distribution ID not set. Skipping cache invalidation."
fi

# Step 5: Create deployment marker
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "/tmp/deployment-${PROJECT}.json" <<EOF
{
  "project": "${PROJECT}",
  "version": "${VERSION}",
  "environment": "${ENVIRONMENT}",
  "timestamp": "${TIMESTAMP}",
  "s3_bucket": "${S3_BUCKET}",
  "deployed_by": "${USER}"
}
EOF

aws s3 cp "/tmp/deployment-${PROJECT}.json" "s3://${S3_BUCKET}/deployments/${VERSION}.json"

print_info "Deployment marker created"

# Step 6: Verify deployment
print_info "Verifying deployment..."

if aws s3 ls "s3://${S3_BUCKET}/v${VERSION}/index.html" > /dev/null 2>&1; then
    print_info "✓ Deployment verified successfully"
else
    print_error "✗ Deployment verification failed"
    exit 1
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════"
print_info "Deployment Summary"
echo "═══════════════════════════════════════════════════"
print_info "Project:     ${NX_PROJECT}"
print_info "Version:     ${VERSION}"
print_info "Environment: ${ENVIRONMENT}"
print_info "S3 Bucket:   ${S3_BUCKET}"
print_info "URLs:"
print_info "  - Latest:  https://cdn.example.com/${PROJECT}/latest/"
print_info "  - Version: https://cdn.example.com/${PROJECT}/v${VERSION}/"
echo "═══════════════════════════════════════════════════"
echo ""

print_info "🎉 Deployment completed successfully!"
