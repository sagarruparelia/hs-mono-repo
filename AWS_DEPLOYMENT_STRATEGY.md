# AWS Deployment Strategy - Micro-Frontends Architecture

Complete guide for deploying this micro-frontends monorepo to AWS with independent deployments, CDN distribution, and zero-downtime updates.

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   CloudFront (CDN)                       │
│              https://yourapp.example.com                 │
└────────┬────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┬─────────────┐
         │                 │                 │             │
    ┌────▼────┐      ┌─────▼─────┐   ┌─────▼─────┐  ┌────▼────┐
    │ S3: CL  │      │ S3: HS    │   │S3:Profile │  │S3:Summary│
    │ /cl/*   │      │ /hs/*     │   │/mfe/prof/ │  │/mfe/sum/ │
    └─────────┘      └───────────┘   └───────────┘  └──────────┘
         │                 │                 │             │
         └─────────────────┴─────────────────┴─────────────┘
                                  │
                            ┌─────▼─────┐
                            │    ALB    │
                            │ /api/*    │
                            └─────┬─────┘
                                  │
                            ┌─────▼─────┐
                            │    ECS    │
                            │Spring Boot│
                            └───────────┘
```

## 📋 Infrastructure Components

### 1. S3 Buckets (Static Hosting)
- **web-cl-bucket** - Client portal shell
- **web-hs-bucket** - Health services shell
- **mfe-profile-bucket** - Profile micro-frontend
- **mfe-summary-bucket** - Summary micro-frontend

### 2. CloudFront Distributions
- **Main Distribution** - Serves all frontends
- Custom origins for each S3 bucket
- HTTPS only with ACM certificate
- Edge caching for global performance

### 3. Route 53
- DNS management
- Health checks
- Failover routing

### 4. ECS Fargate
- Spring Boot BFF backend
- Auto-scaling
- Blue/Green deployments

### 5. Application Load Balancer
- API routing (`/api/*`)
- Health checks
- SSL termination

### 6. RDS/DocumentDB
- MongoDB-compatible database
- Multi-AZ deployment
- Automated backups

### 7. ElastiCache (Redis)
- Session storage
- Application caching
- Cluster mode

## 🚀 Deployment Strategy

### Independent Micro-Frontend Deployments

Each micro-frontend can be deployed independently without affecting others:

```bash
# Deploy only Profile MFE
npm run deploy:profile

# Deploy only Summary MFE
npm run deploy:summary

# Deploy only Web CL Shell
npm run deploy:web-cl

# Deploy only Web HS Shell
npm run deploy:web-hs

# Deploy all frontends
npm run deploy:all
```

### Version Management

Use semantic versioning with version-specific folders:

```
s3://mfe-profile-bucket/
├── v1.0.0/
│   ├── remoteEntry.js
│   ├── assets/
│   └── index.html
├── v1.0.1/
│   ├── remoteEntry.js
│   ├── assets/
│   └── index.html
└── latest/  → symlink to v1.0.1
```

## 📦 Build & Deploy Process

### Step 1: Build Applications

```bash
# Build all projects for production
npm run build

# Or build individually
npm run build:profile
npm run build:summary
npm run build:web-cl
npm run build:web-hs
```

### Step 2: Deploy to S3

```bash
# Deploy Profile MFE
aws s3 sync dist/apps/mfe-profile/ s3://mfe-profile-bucket/v1.0.0/ \
  --delete \
  --cache-control "public, max-age=31536000"

# Deploy with versioning script
./scripts/deploy-mfe.sh profile 1.0.0

# Update 'latest' pointer
aws s3 sync s3://mfe-profile-bucket/v1.0.0/ s3://mfe-profile-bucket/latest/ --delete
```

### Step 3: Invalidate CloudFront Cache

```bash
# Invalidate cache for updated files
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/mfe/profile/*" "/latest/*"
```

### Step 4: Update Shell Applications

Update environment variables in shell apps to point to new version:

```bash
# Update Web CL environment
aws s3 cp .env.production s3://web-cl-bucket/config/
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

## 🔧 Environment Configuration

### Development
```bash
VITE_MFE_PROFILE_URL=http://localhost:4203
VITE_MFE_SUMMARY_URL=http://localhost:4204
VITE_API_BASE_URL=http://localhost:8080
```

### Staging
```bash
VITE_MFE_PROFILE_URL=https://d1abc123.cloudfront.net/mfe/profile/latest
VITE_MFE_SUMMARY_URL=https://d1abc123.cloudfront.net/mfe/summary/latest
VITE_API_BASE_URL=https://api-staging.example.com
```

### Production
```bash
VITE_MFE_PROFILE_URL=https://cdn.example.com/mfe/profile/v1.0.0
VITE_MFE_SUMMARY_URL=https://cdn.example.com/mfe/summary/v1.0.0
VITE_API_BASE_URL=https://api.example.com
```

## 🔐 Security Configuration

### S3 Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mfe-profile-bucket/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### CORS Configuration

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://yourapp.example.com",
      "https://staging.example.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 🔄 CI/CD Pipeline (GitHub Actions)

### Workflow Triggers
- **Push to main** → Deploy to production
- **Push to develop** → Deploy to staging
- **Pull request** → Run tests only
- **Manual trigger** → Deploy specific version

### Pipeline Stages

1. **Lint & Test**
   - ESLint
   - TypeScript check
   - Unit tests
   - E2E tests

2. **Build**
   - Build all affected projects
   - Generate source maps
   - Create version tags

3. **Deploy to Staging**
   - Deploy to S3 staging buckets
   - Invalidate CloudFront
   - Run smoke tests

4. **Deploy to Production**
   - Blue/Green deployment
   - Canary deployment (10% → 50% → 100%)
   - Automated rollback on errors

## 📊 Monitoring & Observability

### CloudWatch Dashboards
- Request counts per MFE
- Error rates
- Latency metrics
- Cache hit ratios

### Alarms
- 4xx/5xx error rates > threshold
- Response time > 3s
- Failed deployments
- Health check failures

### X-Ray Tracing
- End-to-end request tracing
- Performance bottleneck identification
- Dependency mapping

## 💰 Cost Optimization

### S3 Storage
- Use S3 Lifecycle policies
- Archive old versions to Glacier
- Delete unused versions after 90 days

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldVersions",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### CloudFront
- Enable compression
- Optimize cache TTLs
- Use CloudFront Functions for redirects

### ECS
- Use Spot instances for non-prod
- Auto-scaling based on load
- Right-size container resources

## 🔄 Rollback Strategy

### Immediate Rollback
```bash
# Point to previous version
./scripts/rollback-mfe.sh profile 1.0.0

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/mfe/profile/*"
```

### Canary Rollback
- Monitor metrics during deployment
- Automatic rollback if error rate > 1%
- Gradual traffic shift: 100% → 50% → 0%

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Version tagged in git
- [ ] Changelog updated
- [ ] Environment variables configured
- [ ] Database migrations ready (if any)
- [ ] Rollback plan documented

### Deployment
- [ ] Build completed successfully
- [ ] Files uploaded to S3
- [ ] CloudFront invalidation completed
- [ ] Smoke tests passing
- [ ] Monitoring dashboards checked
- [ ] No alarms triggered

### Post-Deployment
- [ ] Health checks passing
- [ ] User acceptance testing
- [ ] Performance metrics normal
- [ ] Error rates within SLA
- [ ] Documentation updated
- [ ] Stakeholders notified

## 🚦 Deployment Environments

### 1. Development (Local)
```bash
npm start
```
- Local development servers
- Hot reload enabled
- Debug mode

### 2. Staging (AWS)
```bash
npm run deploy:staging
```
- Mimics production
- Integration testing
- QA validation
- Auto-deployed from `develop` branch

### 3. Production (AWS)
```bash
npm run deploy:production
```
- Blue/Green deployment
- Canary releases
- Manual approval required
- Auto-deployed from `main` branch

## 🔧 Infrastructure as Code

### Terraform Modules
```
terraform/
├── modules/
│   ├── s3-static-hosting/
│   ├── cloudfront-cdn/
│   ├── ecs-fargate/
│   └── alb/
├── environments/
│   ├── staging/
│   └── production/
└── main.tf
```

### AWS CDK Alternative
```typescript
// cdk/lib/mfe-stack.ts
new S3StaticWebsite(this, 'ProfileMFE', {
  bucketName: 'mfe-profile-prod',
  source: '../dist/apps/mfe-profile'
});
```

## 📚 Additional Resources

- **Terraform Files:** `terraform/`
- **GitHub Actions:** `.github/workflows/`
- **Deployment Scripts:** `scripts/`
- **Docker Configs:** `docker/`

## 🎯 Next Steps

1. Set up AWS account and configure credentials
2. Run Terraform to create infrastructure
3. Configure GitHub Actions secrets
4. Test deployment to staging
5. Deploy to production
6. Set up monitoring and alarms

---

**See detailed implementation in:**
- `terraform/README.md` - Infrastructure setup
- `.github/workflows/deploy.yml` - CI/CD pipeline
- `scripts/deploy.sh` - Deployment automation
