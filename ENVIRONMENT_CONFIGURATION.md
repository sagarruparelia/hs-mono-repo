# Environment Configuration Guide

Complete guide for configuring environments in the HS Mono Repo micro-frontends application.

## 📋 Table of Contents

- [Overview](#overview)
- [Environment Files](#environment-files)
- [Configuration by Environment](#configuration-by-environment)
- [Frontend Configuration](#frontend-configuration)
- [Backend Configuration](#backend-configuration)
- [AWS Configuration](#aws-configuration)
- [Security Best Practices](#security-best-practices)
- [Loading Environment Variables](#loading-environment-variables)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The project uses environment-specific configuration files to manage different deployment environments:

- **Development**: Local development with Docker Compose
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Environment File Structure

```
.env.example          # Template with all available variables
.env.development      # Local development configuration
.env.staging          # Staging environment configuration
.env.production       # Production environment configuration
.env.local           # Local overrides (not committed to git)
```

## 📁 Environment Files

### .env.example

Template file showing all available configuration options. Copy this to create environment-specific configs.

```bash
# Create local config
cp .env.example .env.local

# Or use environment-specific files
cp .env.example .env.staging
```

### .env.development

Automatically loaded for local development. Configures:
- Local MongoDB and Redis instances
- MFEs running on localhost ports
- Debug mode enabled
- Verbose logging

### .env.staging

Used for staging deployments. Features:
- AWS DocumentDB and ElastiCache
- CloudFront CDN URLs
- 'latest' pointers for MFEs (auto-updates)
- Analytics and error tracking enabled
- Production-like settings

### .env.production

Production configuration. Includes:
- Production databases with high availability
- Versioned MFE URLs (immutable deployments)
- Minimal logging
- All monitoring enabled
- Optimized cache settings

### .env.local

Local overrides (gitignored). Use for:
- Personal development settings
- Local API keys
- Custom ports
- Feature flag testing

## 🔧 Configuration by Environment

### Development Environment

**Ports:**
```
MFE Profile:  4203
MFE Summary:  4204
Web CL:       4202
Web HS:       4201
BFF API:      8080
MongoDB:      27017
Redis:        6379
```

**Key Settings:**
```bash
NODE_ENV=development
VITE_MFE_PROFILE_URL=http://localhost:4203
VITE_MFE_SUMMARY_URL=http://localhost:4204
VITE_API_BASE_URL=http://localhost:8080
VITE_ENABLE_DEBUG_MODE=true
```

**Start Development:**
```bash
# Option 1: Docker Compose (includes all services)
npm run docker:up

# Option 2: Local Node processes
npm run start
```

### Staging Environment

**URLs:**
```
CDN:     https://d1234567890.cloudfront.net
API:     https://d1234567890.cloudfront.net/api
Profile: https://d1234567890.cloudfront.net/mfe/profile/latest
Summary: https://d1234567890.cloudfront.net/mfe/summary/latest
```

**Key Settings:**
```bash
NODE_ENV=production
ENVIRONMENT=staging
VITE_MFE_PROFILE_URL=https://cdn.staging.example.com/mfe/profile/latest
VITE_MFE_SUMMARY_URL=https://cdn.staging.example.com/mfe/summary/latest
VITE_ENABLE_ANALYTICS=true
```

**Deploy to Staging:**
```bash
# Set environment
export DEPLOY_ENV=staging

# Deploy all
npm run deploy:all

# Or deploy individually
npm run deploy:profile
npm run deploy:summary
```

### Production Environment

**URLs:**
```
CDN:     https://cdn.example.com
API:     https://api.example.com
Profile: https://cdn.example.com/mfe/profile/v1.0.0
Summary: https://cdn.example.com/mfe/summary/v1.0.0
```

**Key Settings:**
```bash
NODE_ENV=production
ENVIRONMENT=production
VITE_MFE_PROFILE_URL=https://cdn.example.com/mfe/profile/v1.0.0
VITE_MFE_SUMMARY_URL=https://cdn.example.com/mfe/summary/v1.0.0
VITE_ENABLE_DEBUG_MODE=false
LOGGING_LEVEL_ROOT=WARN
```

**Deploy to Production:**
```bash
# Set environment
export DEPLOY_ENV=production

# Deploy with specific version
./scripts/deploy-mfe.sh profile 1.0.0 production
./scripts/deploy-mfe.sh summary 1.0.0 production
```

## 🎨 Frontend Configuration

### Vite Environment Variables

Vite exposes environment variables prefixed with `VITE_` to the client-side code.

**Available Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_MFE_PROFILE_URL` | Profile MFE remote entry URL | `http://localhost:4203` |
| `VITE_MFE_SUMMARY_URL` | Summary MFE remote entry URL | `http://localhost:4204` |
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8080` |
| `VITE_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `VITE_ENABLE_ANALYTICS` | Enable analytics tracking | `true` / `false` |
| `VITE_ENABLE_ERROR_TRACKING` | Enable error tracking | `true` / `false` |
| `VITE_ENABLE_DEBUG_MODE` | Enable debug mode | `true` / `false` |
| `VITE_AUTH_DOMAIN` | Auth0/OAuth domain | `auth.example.com` |
| `VITE_AUTH_CLIENT_ID` | OAuth client ID | `abc123...` |

### Accessing in Code

```typescript
// In any frontend component or module
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const profileUrl = import.meta.env.VITE_MFE_PROFILE_URL;
const isDebug = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true';

// Check environment
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```

### Module Federation Configuration

Update `vite.config.ts` based on environment:

```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      federation({
        name: 'web_cl',
        remotes: {
          mfe_profile: {
            type: 'module',
            name: 'mfe_profile',
            entry: env.VITE_MFE_PROFILE_URL + '/remoteEntry.js',
          },
          mfe_summary: {
            type: 'module',
            name: 'mfe_summary',
            entry: env.VITE_MFE_SUMMARY_URL + '/remoteEntry.js',
          },
        },
      }),
    ],
  };
});
```

## 🔨 Backend Configuration

### Spring Boot Application Properties

The BFF (Backend for Frontend) uses Spring Boot profiles to manage environments.

**Profile Selection:**
```bash
# Via environment variable
SPRING_PROFILES_ACTIVE=development

# Via command line
java -jar app.jar --spring.profiles.active=production

# Via application.properties
spring.profiles.active=staging
```

### MongoDB Configuration

**Development (Local):**
```bash
SPRING_DATA_MONGODB_URI=mongodb://admin:password123@localhost:27017/hs_mono_repo?authSource=admin
```

**Staging/Production (AWS DocumentDB):**
```bash
SPRING_DATA_MONGODB_URI=mongodb://admin:PASSWORD@docdb.cluster-xxx.us-east-1.docdb.amazonaws.com:27017/hs_mono_repo?tls=true&tlsCAFile=/app/rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Redis Configuration

**Development (Local):**
```bash
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=redis123
```

**Staging/Production (AWS ElastiCache):**
```bash
SPRING_DATA_REDIS_HOST=redis.cluster-xxx.use1.cache.amazonaws.com
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=SECURE_PASSWORD
SPRING_DATA_REDIS_SSL=true
```

### Logging Configuration

**Development:**
```bash
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_HS=DEBUG
LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB=DEBUG
```

**Staging:**
```bash
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_HS=INFO
```

**Production:**
```bash
LOGGING_LEVEL_ROOT=WARN
LOGGING_LEVEL_COM_HS=INFO
```

## ☁️ AWS Configuration

### Required AWS Variables

For deployment and infrastructure management:

```bash
# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=abc123...

# CloudFront Distribution IDs (from terraform output)
CLOUDFRONT_DISTRIBUTION_ID_STAGING=E1234567890ABC
CLOUDFRONT_DISTRIBUTION_ID_PROD=E0987654321XYZ

# S3 Bucket Names (auto-generated by terraform)
S3_BUCKET_PROFILE=hs-mono-repo-mfe-profile-${ENVIRONMENT}
S3_BUCKET_SUMMARY=hs-mono-repo-mfe-summary-${ENVIRONMENT}
S3_BUCKET_WEB_CL=hs-mono-repo-web-cl-${ENVIRONMENT}
S3_BUCKET_WEB_HS=hs-mono-repo-web-hs-${ENVIRONMENT}
```

### Getting CloudFront Distribution IDs

After running `terraform apply`:

```bash
cd terraform
terraform output cloudfront_distribution_id_staging
terraform output cloudfront_distribution_id_prod
```

### Setting Environment Variables for Deployment

**Option 1: Export in shell**
```bash
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=abc123...
export CLOUDFRONT_DISTRIBUTION_ID_STAGING=E123...
```

**Option 2: AWS CLI credentials**
```bash
aws configure
# Then deployment scripts will use default profile
```

**Option 3: GitHub Actions Secrets**
```bash
# Add these secrets in GitHub repository settings:
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
CLOUDFRONT_DISTRIBUTION_ID_STAGING
CLOUDFRONT_DISTRIBUTION_ID_PROD
```

## 🔐 Security Best Practices

### 1. Never Commit Secrets

Add sensitive files to `.gitignore`:
```
.env.local
.env.*.local
.env.production
*.pem
*.key
```

### 2. Use AWS Secrets Manager (Production)

Instead of hardcoding passwords:

```bash
# Store secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name hs-mono-repo/production/mongodb-password \
  --secret-string "your-secure-password"

# Retrieve in application
SPRING_DATA_MONGODB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id hs-mono-repo/production/mongodb-password \
  --query SecretString --output text)
```

### 3. Rotate Credentials Regularly

```bash
# MongoDB password
aws docdb modify-db-cluster \
  --db-cluster-identifier hs-mono-repo-docdb-production \
  --master-user-password NEW_PASSWORD

# Redis auth token
aws elasticache modify-replication-group \
  --replication-group-id hs-mono-repo-redis-production \
  --auth-token NEW_TOKEN
```

### 4. Use IAM Roles (EC2/ECS)

Instead of access keys, assign IAM roles:

```hcl
# In Terraform
resource "aws_iam_role" "ecs_task_role" {
  name = "hs-mono-repo-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}
```

### 5. Encrypt Environment Variables

For CI/CD:
```bash
# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 .env.production

# Decrypt in CI
gpg --quiet --batch --yes --decrypt \
  --passphrase="$GPG_PASSPHRASE" \
  --output .env.production .env.production.gpg
```

## 📥 Loading Environment Variables

### Local Development

```bash
# Vite automatically loads:
.env                # All environments
.env.local          # All environments (gitignored)
.env.[mode]         # Mode-specific (development, production)
.env.[mode].local   # Mode-specific local overrides

# Priority (highest to lowest):
# 1. .env.[mode].local
# 2. .env.[mode]
# 3. .env.local
# 4. .env
```

### Build Time

```bash
# Build with staging config
npm run build --mode=staging

# Build with production config
npm run build --mode=production

# Custom mode
npm run build --mode=custom
```

### Runtime (Docker)

```bash
# Docker Compose with env file
docker-compose --env-file .env.staging up

# Docker run with env file
docker run --env-file .env.production hs-mono-repo-bff

# Pass individual variables
docker run -e SPRING_PROFILES_ACTIVE=production hs-mono-repo-bff
```

### ECS Task Definition

```json
{
  "containerDefinitions": [{
    "environment": [
      { "name": "SPRING_PROFILES_ACTIVE", "value": "production" },
      { "name": "SPRING_DATA_REDIS_HOST", "value": "redis.xxx.cache.amazonaws.com" }
    ],
    "secrets": [
      {
        "name": "SPRING_DATA_MONGODB_PASSWORD",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:mongo-password"
      }
    ]
  }]
}
```

## 🐛 Troubleshooting

### Issue: Environment variables not loading

**Check 1: Verify file exists**
```bash
ls -la .env*
```

**Check 2: Verify VITE_ prefix**
```typescript
// ❌ Won't work (no VITE_ prefix)
const apiUrl = import.meta.env.API_BASE_URL;

// ✅ Works
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

**Check 3: Restart dev server**
```bash
# Vite caches env vars, restart to reload
npm run start:web-cl
```

### Issue: Wrong environment loaded

**Check NODE_ENV:**
```bash
echo $NODE_ENV

# Set explicitly
NODE_ENV=production npm run build
```

**Check Vite mode:**
```bash
# Specify mode flag
vite build --mode staging
```

### Issue: Module Federation remotes not loading

**Check remote URLs:**
```bash
# Test remote entry is accessible
curl https://cdn.example.com/mfe/profile/latest/remoteEntry.js

# Check CORS headers
curl -I https://cdn.example.com/mfe/profile/latest/remoteEntry.js
```

**Verify environment variables:**
```typescript
// Add debug logging
console.log('Profile URL:', import.meta.env.VITE_MFE_PROFILE_URL);
console.log('Summary URL:', import.meta.env.VITE_MFE_SUMMARY_URL);
```

### Issue: Backend can't connect to MongoDB

**Check connection string:**
```bash
# Test MongoDB connection
mongosh "$SPRING_DATA_MONGODB_URI"

# Check if MongoDB is running
docker ps | grep mongo
```

**Verify credentials:**
```bash
# MongoDB Atlas/DocumentDB requires proper auth
mongodb://[username]:[password]@[host]:[port]/[database]?authSource=admin
```

### Issue: Redis connection failed

**Check Redis connectivity:**
```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a redis123 ping

# Or with Docker
docker exec -it hs-redis redis-cli -a redis123 ping
```

**Check SSL/TLS for ElastiCache:**
```bash
# ElastiCache requires SSL in production
SPRING_DATA_REDIS_SSL=true
```

## 📚 Additional Resources

- [Vite Environment Variables Docs](https://vitejs.dev/guide/env-and-mode.html)
- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)

## ✅ Checklist

### Before Deployment

- [ ] All secrets stored in AWS Secrets Manager
- [ ] `.env.production` not committed to git
- [ ] CloudFront distribution IDs configured
- [ ] S3 bucket names match terraform outputs
- [ ] MongoDB/Redis passwords rotated
- [ ] SSL certificates valid
- [ ] Feature flags configured for environment
- [ ] Analytics/monitoring enabled
- [ ] API timeouts appropriate for environment

### After Deployment

- [ ] Test all MFE remotes load correctly
- [ ] Verify API connectivity
- [ ] Check CloudWatch logs
- [ ] Validate MongoDB/Redis connections
- [ ] Test authentication flows
- [ ] Verify CloudFront cache behavior
- [ ] Run smoke tests
- [ ] Monitor error rates

---

**Need Help?** Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) or contact DevOps team.
