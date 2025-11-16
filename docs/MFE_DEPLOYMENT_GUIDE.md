# MFE Deployment Guide for External Consumers

Complete guide for deploying and maintaining MFEs that external consumers can integrate.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Deployment Process](#deployment-process)
5. [Version Management](#version-management)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Best Practices](#best-practices)

---

## Overview

This guide covers deploying MFEs to AWS S3 and CloudFront for external consumption using Module Federation and Web Components.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                           │
│  (GitHub Actions / GitLab CI / Jenkins)                      │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ Deploy
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                    S3 Bucket Structure                        │
│  hs-mfe-production/                                          │
│  ├── mfe-profile/                                            │
│  │   ├── v1.0.0/                                            │
│  │   │   ├── remoteEntry.js                                 │
│  │   │   ├── manifest.json                                  │
│  │   │   ├── types.d.ts                                     │
│  │   │   ├── INTEGRATION.md                                 │
│  │   │   └── assets/                                        │
│  │   ├── v1.0.1/                                            │
│  │   └── latest/ → v1.0.1                                   │
│  ├── mfe-summary/                                            │
│  └── registry.json                                           │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ Cached & Distributed
                 ▼
┌──────────────────────────────────────────────────────────────┐
│              CloudFront Distribution                          │
│  https://cdn.example.com/                                    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ Consumed by
                 ▼
┌──────────────────────────────────────────────────────────────┐
│              External Consumer Apps                           │
│  (React, Angular, Vue, Vanilla JS)                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### 1. AWS Account & CLI

```bash
# Install AWS CLI
brew install awscli  # macOS
# or
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### 2. Node.js & Dependencies

```bash
# Node.js 18+
node --version

# Install dependencies
npm install
```

### 3. Required Tools

```bash
# jq (for JSON processing)
brew install jq  # macOS
sudo apt-get install jq  # Ubuntu

# tsx (for TypeScript execution)
npm install -g tsx
```

---

## Infrastructure Setup

### Step 1: Create S3 Buckets

Create buckets for staging and production:

```bash
# Staging
./infrastructure/setup-s3-mfe-buckets.sh staging

# Production
./infrastructure/setup-s3-mfe-buckets.sh production
```

This script will:
- Create S3 bucket with versioning
- Apply CORS configuration
- Set bucket policy (public read)
- Configure lifecycle policies
- Add appropriate tags

**Manual Setup (Alternative):**

```bash
# Create bucket
aws s3 mb s3://hs-mfe-production --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hs-mfe-production \
  --versioning-configuration Status=Enabled

# Apply CORS
aws s3api put-bucket-cors \
  --bucket hs-mfe-production \
  --cors-configuration file://infrastructure/s3-cors-config.json

# Apply bucket policy
aws s3api put-bucket-policy \
  --bucket hs-mfe-production \
  --policy file://infrastructure/s3-bucket-policy.json
```

### Step 2: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name hs-mfe-production.s3.amazonaws.com \
  --default-root-object index.html
```

**CloudFront Configuration (recommended):**

```json
{
  "CallerReference": "mfe-distribution-v1",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-hs-mfe-production",
        "DomainName": "hs-mfe-production.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-hs-mfe-production",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "CachedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true
}
```

### Step 3: Set Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc

# Staging
export S3_BUCKET_STAGING="hs-mfe-staging"
export CLOUDFRONT_MFE_STAGING_ID="E1234567890ABC"
export CDN_URL="https://cdn-staging.example.com"

# Production
export S3_BUCKET_PROD="hs-mfe-production"
export CLOUDFRONT_MFE_PROD_ID="E0987654321XYZ"
export CDN_URL="https://cdn.example.com"
```

---

## Deployment Process

### Quick Deploy

```bash
# Deploy to staging
./scripts/deploy-mfe-external.sh mfe-profile 1.0.0 staging

# Deploy to production
./scripts/deploy-mfe-external.sh mfe-profile 1.0.0 production
```

### Deployment Steps Explained

#### 1. Build MFE

```bash
export VITE_CDN_URL="https://cdn.example.com"
export VITE_MFE_VERSION="1.0.0"
nx build mfe-profile --configuration=production
```

#### 2. Generate Manifest

```bash
npx tsx scripts/generate-mfe-manifest.ts \
  mfe-profile 1.0.0 production https://cdn.example.com \
  > dist/apps/mfe-profile/manifest.json
```

#### 3. Generate TypeScript Definitions

Automatically generated based on exposed modules.

#### 4. Create Integration Guide

Auto-generated markdown with:
- Quick start instructions
- Integration examples
- Available modules
- Version information

#### 5. Upload to S3

```bash
# Static assets (long cache)
aws s3 sync dist/apps/mfe-profile/ s3://hs-mfe-production/mfe-profile/v1.0.0/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "remoteEntry.js" --exclude "manifest.json"

# Remote entry (short cache)
aws s3 cp dist/apps/mfe-profile/remoteEntry.js \
  s3://hs-mfe-production/mfe-profile/v1.0.0/remoteEntry.js \
  --cache-control "public, max-age=300"

# Manifest (no cache)
aws s3 cp dist/apps/mfe-profile/manifest.json \
  s3://hs-mfe-production/mfe-profile/v1.0.0/manifest.json \
  --cache-control "no-cache"
```

#### 6. Update 'latest' Pointer

```bash
# Create version pointer
echo "1.0.0" | aws s3 cp - s3://hs-mfe-production/mfe-profile/latest.txt

# Sync to latest directory
aws s3 sync s3://hs-mfe-production/mfe-profile/v1.0.0/ \
  s3://hs-mfe-production/mfe-profile/latest/
```

#### 7. Update Registry

```bash
# Global MFE registry
cat > registry-entry.json <<EOF
{
  "mfeName": "mfe-profile",
  "latestVersion": "1.0.0",
  "manifestUrl": "https://cdn.example.com/mfe-profile/1.0.0/manifest.json",
  "environment": "production",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

aws s3 cp registry-entry.json s3://hs-mfe-production/registry/mfe-profile.json
```

#### 8. Invalidate CloudFront

```bash
aws cloudfront create-invalidation \
  --distribution-id E0987654321XYZ \
  --paths "/mfe-profile/*" "/registry.json"
```

### Deployment Checklist

Before deploying:

- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
- [ ] Staging deployment successful
- [ ] Integration tests passed

---

## Version Management

### Semantic Versioning

Follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### Version Release Process

#### 1. Determine Version Bump

```bash
# Breaking change?
npm version major  # 1.0.0 → 2.0.0

# New feature?
npm version minor  # 1.0.0 → 1.1.0

# Bug fix?
npm version patch  # 1.0.0 → 1.0.1
```

#### 2. Update CHANGELOG

```markdown
## [1.1.0] - 2025-01-13

### Added
- New ProfileSettings component exposed
- Support for custom themes

### Changed
- Improved loading performance

### Fixed
- Fixed crash on missing user data
```

#### 3. Deploy New Version

```bash
# Deploy to staging first
./scripts/deploy-mfe-external.sh mfe-profile 1.1.0 staging

# Test in staging
# ...

# Deploy to production
./scripts/deploy-mfe-external.sh mfe-profile 1.1.0 production
```

#### 4. Tag Release

```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### Managing Multiple Versions

Keep multiple versions available:

```
mfe-profile/
├── v1.0.0/    # Old stable
├── v1.0.1/    # Patch
├── v1.1.0/    # New features
├── v2.0.0/    # Breaking changes
└── latest/ → v1.1.0
```

Consumers can pin to specific versions:
```typescript
// Pin to v1.x.x (safe)
entry: 'https://cdn.example.com/mfe-profile/v1.1.0/remoteEntry.js'

// Use latest (auto-update)
entry: 'https://cdn.example.com/mfe-profile/latest/remoteEntry.js'
```

### Deprecation Policy

When deprecating a version:

1. Announce 30 days in advance
2. Update documentation
3. Mark as deprecated in registry
4. Keep available for 90 days
5. Remove after grace period

---

## Monitoring & Maintenance

### CloudFront Metrics

Monitor in AWS Console:
- Requests
- Data Transfer
- Error Rate (4xx, 5xx)
- Cache Hit Ratio

### S3 Metrics

- Storage Used
- Number of Objects
- GET Requests

### Access Logs

Enable CloudFront logging:

```bash
aws cloudfront update-distribution \
  --id E0987654321XYZ \
  --logging-config Enabled=true,Bucket=mfe-logs.s3.amazonaws.com
```

Analyze logs:
```bash
# Most requested MFEs
aws s3 cp s3://mfe-logs/access-logs/ . --recursive
cat *.gz | gunzip | awk '{print $7}' | sort | uniq -c | sort -rn | head -20
```

### Health Checks

Create automated health checks:

```bash
#!/bin/bash
# health-check.sh

MFES=("mfe-profile" "mfe-summary" "mfe-documents")
CDN_URL="https://cdn.example.com"

for mfe in "${MFES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${CDN_URL}/${mfe}/latest/manifest.json")

  if [ "$STATUS" -eq 200 ]; then
    echo "✓ $mfe: OK"
  else
    echo "✗ $mfe: FAILED (HTTP $STATUS)"
    # Send alert
  fi
done
```

Run periodically:
```bash
# Add to crontab
*/5 * * * * /path/to/health-check.sh
```

---

## Rollback Procedures

### Emergency Rollback

If a deployment causes issues:

```bash
# 1. Update 'latest' to previous version
aws s3 sync s3://hs-mfe-production/mfe-profile/v1.0.0/ \
  s3://hs-mfe-production/mfe-profile/latest/ \
  --delete

# 2. Update version pointer
echo "1.0.0" | aws s3 cp - s3://hs-mfe-production/mfe-profile/latest.txt

# 3. Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E0987654321XYZ \
  --paths "/mfe-profile/latest/*"

# 4. Update registry
# (update registry/mfe-profile.json with previous version)
```

### Automated Rollback Script

```bash
#!/bin/bash
# rollback-mfe.sh <mfe-name> <target-version> <environment>

MFE_NAME=$1
TARGET_VERSION=$2
ENVIRONMENT=$3

echo "Rolling back $MFE_NAME to $TARGET_VERSION in $ENVIRONMENT"

# Update latest pointer
aws s3 sync "s3://hs-mfe-${ENVIRONMENT}/${MFE_NAME}/${TARGET_VERSION}/" \
  "s3://hs-mfe-${ENVIRONMENT}/${MFE_NAME}/latest/" \
  --delete

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_ID" \
  --paths "/${MFE_NAME}/latest/*"

echo "✓ Rollback complete"
```

---

## Best Practices

### 1. Always Test in Staging First

```bash
# Deploy to staging
./scripts/deploy-mfe-external.sh mfe-profile 1.1.0 staging

# Run integration tests
npm run test:integration

# Deploy to production only if tests pass
./scripts/deploy-mfe-external.sh mfe-profile 1.1.0 production
```

### 2. Use Semantic Versioning Strictly

Breaking changes = MAJOR version bump

### 3. Keep Multiple Versions Available

Don't delete old versions immediately. Keep them for at least 90 days.

### 4. Document Breaking Changes

```markdown
## Breaking Changes in v2.0.0

- `ProfilePage` now requires `userId` prop
- Removed deprecated `UserContext`
- Minimum React version: 19.0.0
```

### 5. Implement Monitoring

- Set up CloudWatch alarms
- Monitor error rates
- Track usage metrics

### 6. Automate Deployments

Use CI/CD pipelines (GitHub Actions, GitLab CI):

```yaml
# .github/workflows/deploy-mfe.yml
name: Deploy MFE
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install
        run: npm ci
      - name: Deploy
        run: ./scripts/deploy-mfe-external.sh mfe-profile ${{ github.ref_name }} production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 7. Security Scanning

Scan for vulnerabilities before deploying:

```bash
npm audit
npm run lint:security
```

### 8. Performance Optimization

- Enable gzip/brotli compression
- Use code splitting
- Minimize bundle size
- Lazy load dependencies

### 9. Communication

Notify consumers of:
- New releases
- Breaking changes
- Deprecations
- Security updates

### 10. Documentation

Keep docs updated:
- Integration guides
- API references
- Migration guides
- Changelogs

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy MFE to Production

on:
  push:
    tags:
      - 'mfe-profile-v*'

env:
  MFE_NAME: mfe-profile
  CDN_URL: https://cdn.example.com

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/mfe-profile-v}" >> $GITHUB_OUTPUT

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to staging
        run: |
          ./scripts/deploy-mfe-external.sh ${{ env.MFE_NAME }} ${{ steps.version.outputs.VERSION }} staging
        env:
          S3_BUCKET_STAGING: hs-mfe-staging
          CLOUDFRONT_MFE_STAGING_ID: ${{ secrets.CLOUDFRONT_STAGING_ID }}

      - name: Run integration tests
        run: npm run test:integration:${{ env.MFE_NAME }}

      - name: Deploy to production
        if: success()
        run: |
          ./scripts/deploy-mfe-external.sh ${{ env.MFE_NAME }} ${{ steps.version.outputs.VERSION }} production
        env:
          S3_BUCKET_PROD: hs-mfe-production
          CLOUDFRONT_MFE_PROD_ID: ${{ secrets.CLOUDFRONT_PROD_ID }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ steps.version.outputs.VERSION }}
          body: |
            ## MFE Deployment
            - MFE: ${{ env.MFE_NAME }}
            - Version: ${{ steps.version.outputs.VERSION }}
            - CDN: ${{ env.CDN_URL }}/${{ env.MFE_NAME }}/${{ steps.version.outputs.VERSION }}/

            See [Integration Guide](${{ env.CDN_URL }}/${{ env.MFE_NAME }}/${{ steps.version.outputs.VERSION }}/INTEGRATION.md)
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** Deployment fails with 403 Forbidden
**Solution:** Check AWS credentials and S3 bucket permissions

**Issue:** CloudFront serves old version
**Solution:** Wait for cache invalidation to complete or increase invalidation paths

**Issue:** CORS errors from consumer apps
**Solution:** Verify CORS configuration in S3 bucket

### Getting Help

- Documentation: `/docs/MFE_CONSUMER_GUIDE.md`
- GitHub Issues: [repository]/issues
- Email: support@example.com

---

## Appendix

### File Locations

- Deployment script: `scripts/deploy-mfe-external.sh`
- Manifest generator: `scripts/generate-mfe-manifest.ts`
- S3 setup: `infrastructure/setup-s3-mfe-buckets.sh`
- CORS config: `infrastructure/s3-cors-config.json`
- Consumer guide: `docs/MFE_CONSUMER_GUIDE.md`

### Useful Commands

```bash
# List all deployed versions
aws s3 ls s3://hs-mfe-production/mfe-profile/ --recursive

# Check manifest
curl https://cdn.example.com/mfe-profile/latest/manifest.json | jq

# Download types
curl -O https://cdn.example.com/mfe-profile/latest/types.d.ts

# Check CloudFront invalidations
aws cloudfront list-invalidations --distribution-id E0987654321XYZ
```

---

*Last updated: 2025-01-13*
