#!/bin/bash
# Build Lambda deployment package for GuardDuty handler

set -e

echo "Building GuardDuty Lambda handler..."

# Clean previous build
rm -f guardduty-handler.zip

# Create zip file
zip -j guardduty-handler.zip index.py

echo "✓ Lambda package created: guardduty-handler.zip"
echo "  Size: $(du -h guardduty-handler.zip | cut -f1)"

# Optional: Upload to S3 for Terraform
# aws s3 cp guardduty-handler.zip s3://your-terraform-bucket/lambda/
