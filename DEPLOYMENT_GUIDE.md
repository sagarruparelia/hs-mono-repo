# Deployment Guide - Step-by-Step

This guide walks you through deploying the micro-frontends monorepo to AWS from scratch.

## 📋 Prerequisites

### Required Tools
- [x] AWS CLI installed and configured
- [x] Terraform >= 1.5
- [x] Node.js 20+
- [x] Docker (for backend)
- [x] Git

### AWS Account Setup
- [x] AWS Account with appropriate permissions
- [x] Access Key ID and Secret Access Key
- [x] Domain name (optional, for production)

## 🚀 Step-by-Step Deployment

### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter your credentials:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### Step 2: Create Terraform State Backend

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket hs-mono-repo-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket hs-mono-repo-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 3: Initialize Terraform

```bash
cd terraform

# Create terraform.tfvars file
cat > terraform.tfvars <<EOF
aws_region          = "us-east-1"
environment         = "staging"
domain_name         = "staging.example.com"
db_master_username  = "admin"
db_master_password  = "ChangeMe123!"  # Use AWS Secrets Manager in production
EOF

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan

# Apply infrastructure (creates all AWS resources)
terraform apply
```

**Note:** This will create approximately $200-500/month in AWS costs depending on usage.

### Step 4: Build Applications

```bash
# Return to project root
cd ..

# Install dependencies
npm install

# Build all projects
npm run build

# Verify builds
ls -la dist/apps/
```

### Step 5: Deploy Frontend Applications

#### Using Deployment Scripts

```bash
# Deploy Profile MFE
./scripts/deploy-mfe.sh profile 1.0.0 staging

# Deploy Summary MFE
./scripts/deploy-mfe.sh summary 1.0.0 staging

# Deploy Web CL Shell
./scripts/deploy-mfe.sh web-cl 1.0.0 staging

# Deploy Web HS Shell
./scripts/deploy-mfe.sh web-hs 1.0.0 staging
```

#### Using NPM Scripts

```bash
# Add deploy scripts to package.json
npm run deploy:profile    # Coming soon
npm run deploy:summary    # Coming soon
npm run deploy:all        # Coming soon
```

### Step 6: Deploy Backend Application

```bash
# Build Docker image
cd apps/bff
docker build -t hs-mono-repo-bff:latest .

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag hs-mono-repo-bff:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hs-mono-repo-bff:latest

docker push \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hs-mono-repo-bff:latest

# Update ECS service
aws ecs update-service \
  --cluster hs-mono-repo-cluster-staging \
  --service hs-mono-repo-bff-service-staging \
  --force-new-deployment
```

### Step 7: Configure DNS (Optional)

If you own a domain:

```bash
# Get CloudFront distribution domain name
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)

# Create CNAME record in your DNS provider
# Point staging.example.com -> $CLOUDFRONT_DOMAIN
```

### Step 8: Verify Deployment

```bash
# Get the CloudFront domain
terraform output cloudfront_domain_name

# Test the endpoints
curl https://CLOUDFRONT_DOMAIN/mfe/profile/latest/
curl https://CLOUDFRONT_DOMAIN/mfe/summary/latest/
curl https://CLOUDFRONT_DOMAIN/cl/
curl https://CLOUDFRONT_DOMAIN/hs/
curl https://CLOUDFRONT_DOMAIN/api/health
```

## 🔐 Environment Variables

### Staging (.env.staging)

```bash
# Frontend
VITE_ENVIRONMENT=staging
VITE_MFE_PROFILE_URL=https://CLOUDFRONT_DOMAIN/mfe/profile/latest
VITE_MFE_SUMMARY_URL=https://CLOUDFRONT_DOMAIN/mfe/summary/latest
VITE_API_BASE_URL=https://CLOUDFRONT_DOMAIN/api

# Backend
SPRING_PROFILES_ACTIVE=staging
SPRING_DATA_MONGODB_URI=mongodb://user:pass@docdb.amazonaws.com:27017/db
SPRING_DATA_REDIS_HOST=redis.amazonaws.com
```

### Production (.env.production)

```bash
# Frontend
VITE_ENVIRONMENT=production
VITE_MFE_PROFILE_URL=https://cdn.example.com/mfe/profile/v1.0.0
VITE_MFE_SUMMARY_URL=https://cdn.example.com/mfe/summary/v1.0.0
VITE_API_BASE_URL=https://api.example.com

# Backend
SPRING_PROFILES_ACTIVE=production
SPRING_DATA_MONGODB_URI=mongodb://user:pass@docdb.amazonaws.com:27017/db
SPRING_DATA_REDIS_HOST=redis.amazonaws.com
```

## 🔄 CI/CD Setup

### GitHub Actions Secrets

Add these secrets to your GitHub repository:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=abc123...
AWS_REGION=us-east-1
CLOUDFRONT_DISTRIBUTION_ID_STAGING=E123...
CLOUDFRONT_DISTRIBUTION_ID_PROD=E456...
```

### Auto-Deploy Configuration

1. Push to `develop` → Auto-deploy to staging
2. Push to `main` → Auto-deploy to production
3. Manual trigger → Deploy specific version

## 📊 Monitoring Setup

### CloudWatch Dashboards

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name hs-mono-repo-${ENVIRONMENT} \
  --dashboard-body file://cloudwatch-dashboard.json
```

### Alarms

```bash
# Create alarm for 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name hs-mono-repo-5xx-errors \
  --alarm-description "Alert on 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/CloudFront \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## 🔄 Update Deployment

### Deploy New Version

```bash
# Update code
git pull origin main

# Build new version
npm run build

# Deploy with new version number
./scripts/deploy-mfe.sh profile 1.0.1 production
```

### Rollback

```bash
# Rollback to previous version
./scripts/deploy-mfe.sh profile 1.0.0 production

# Or update 'latest' pointer
aws s3 sync \
  s3://hs-mono-repo-mfe-profile-prod/v1.0.0/ \
  s3://hs-mono-repo-mfe-profile-prod/latest/ \
  --delete
```

## 💰 Cost Optimization

### Development Environment

```bash
# Stop ECS services when not in use
aws ecs update-service \
  --cluster hs-mono-repo-cluster-staging \
  --service hs-mono-repo-bff-service-staging \
  --desired-count 0

# Start when needed
aws ecs update-service \
  --cluster hs-mono-repo-cluster-staging \
  --service hs-mono-repo-bff-service-staging \
  --desired-count 2
```

### Use Terraform Workspaces

```bash
# Create dev environment
terraform workspace new dev
terraform apply -var="environment=dev" -var="ecs_desired_count=1"

# Switch to production
terraform workspace select production
terraform apply -var="environment=production"
```

## 🗑️ Teardown

### Remove All Infrastructure

```bash
# WARNING: This will delete all resources

cd terraform
terraform destroy

# Manually delete S3 buckets (if they have content)
aws s3 rb s3://hs-mono-repo-mfe-profile-staging --force
aws s3 rb s3://hs-mono-repo-mfe-summary-staging --force
aws s3 rb s3://hs-mono-repo-web-cl-staging --force
aws s3 rb s3://hs-mono-repo-web-hs-staging --force
```

## 📝 Checklist

### Pre-Deployment
- [ ] AWS credentials configured
- [ ] Domain name available (optional)
- [ ] SSL certificate requested
- [ ] Terraform backend created
- [ ] All tests passing

### Initial Deployment
- [ ] Terraform infrastructure created
- [ ] All frontends built
- [ ] All frontends deployed to S3
- [ ] Backend Docker image pushed
- [ ] ECS service running
- [ ] DNS configured
- [ ] Smoke tests passing

### Post-Deployment
- [ ] Monitoring configured
- [ ] Alarms set up
- [ ] Logs being collected
- [ ] Backups configured
- [ ] Documentation updated
- [ ] Team notified

## 🆘 Troubleshooting

### CloudFront 403 Errors
- Check S3 bucket policy allows CloudFront access
- Verify Origin Access Control is configured
- Check file exists in S3

### MFEs Not Loading
- Verify remoteEntry.js is accessible
- Check CORS configuration
- Verify environment variables in shells

### ECS Service Not Starting
- Check ECR image exists
- Verify task definition is valid
- Check CloudWatch logs
- Verify security groups allow traffic

## 📚 Additional Resources

- [Terraform Documentation](terraform/README.md)
- [GitHub Actions Workflows](.github/workflows/)
- [Deployment Scripts](scripts/)
- [AWS Deployment Strategy](AWS_DEPLOYMENT_STRATEGY.md)

---

**Need Help?** Check troubleshooting section or contact DevOps team.
