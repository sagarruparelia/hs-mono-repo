#!/bin/bash
set -e

# Setup S3 Buckets for MFE Deployment
# Usage: ./infrastructure/setup-s3-mfe-buckets.sh <environment>

ENVIRONMENT=${1:-staging}
REGION=${AWS_REGION:-us-east-1}

if [ "$ENVIRONMENT" == "production" ]; then
    BUCKET_NAME="hs-mfe-production"
else
    BUCKET_NAME="hs-mfe-staging"
fi

echo "🚀 Setting up S3 bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Create bucket
echo "📦 Creating S3 bucket..."
aws s3 mb "s3://${BUCKET_NAME}" --region "$REGION" || echo "Bucket already exists"

# Step 2: Enable versioning
echo "🔄 Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

# Step 3: Apply CORS configuration
echo "🌐 Applying CORS configuration..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration file://infrastructure/s3-cors-config.json

# Step 4: Apply bucket policy (public read)
echo "🔓 Applying bucket policy..."
sed "s/BUCKET_NAME/$BUCKET_NAME/g" infrastructure/s3-bucket-policy.json > /tmp/bucket-policy.json
aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy file:///tmp/bucket-policy.json

# Step 5: Configure static website hosting
echo "🌍 Configuring static website hosting..."
aws s3 website "s3://${BUCKET_NAME}/" \
  --index-document index.html \
  --error-document index.html

# Step 6: Block public access settings (allow public read via policy)
echo "🔐 Configuring public access block..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Step 7: Configure lifecycle policy for old versions
echo "♻️  Configuring lifecycle policy..."
cat > /tmp/lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    },
    {
      "Id": "DeleteOldDeploymentMarkers",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "deployments/"
      },
      "Expiration": {
        "Days": 180
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration file:///tmp/lifecycle-policy.json

# Step 8: Add bucket tags
echo "🏷️  Adding bucket tags..."
aws s3api put-bucket-tagging \
  --bucket "$BUCKET_NAME" \
  --tagging "TagSet=[{Key=Environment,Value=$ENVIRONMENT},{Key=Purpose,Value=MFE-Hosting},{Key=ManagedBy,Value=Automation}]"

# Step 9: Enable server access logging (optional)
if [ "${ENABLE_LOGGING:-false}" == "true" ]; then
  LOG_BUCKET="${BUCKET_NAME}-logs"
  echo "📊 Setting up access logging to $LOG_BUCKET..."

  aws s3 mb "s3://${LOG_BUCKET}" --region "$REGION" || echo "Log bucket already exists"

  aws s3api put-bucket-logging \
    --bucket "$BUCKET_NAME" \
    --bucket-logging-status \
      "LoggingEnabled={TargetBucket=$LOG_BUCKET,TargetPrefix=access-logs/}"
fi

echo ""
echo "✅ S3 bucket setup complete!"
echo ""
echo "Bucket Details:"
echo "  Name:     $BUCKET_NAME"
echo "  Region:   $REGION"
echo "  Endpoint: http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo ""
echo "Next steps:"
echo "  1. Set up CloudFront distribution (recommended)"
echo "  2. Configure custom domain (optional)"
echo "  3. Deploy your first MFE:"
echo "     ./scripts/deploy-mfe-external.sh mfe-profile 1.0.0 $ENVIRONMENT"
