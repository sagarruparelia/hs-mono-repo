# AWS GuardDuty S3 Malware Protection Setup Guide

## Overview

This setup enables **AWS GuardDuty** to automatically scan files uploaded to S3 for malware. When malware is detected, the system:

1. ✅ Quarantines the infected file
2. ✅ Deletes it from the original location
3. ✅ Notifies the BFF via callback
4. ✅ Sends email alerts to the security team
5. ✅ Prevents users from finalizing infected uploads

---

## Architecture

```
User uploads file
    ↓
File lands in S3 temp/
    ↓
GuardDuty automatically scans (within seconds)
    ↓
Finding published to EventBridge
    ↓
Lambda function triggered
    ↓
If INFECTED:
  - Move to quarantine bucket
  - Delete from temp/
  - Update MongoDB (avStatus = INFECTED)
  - Send SNS alert
  - Block finalization

If CLEAN:
  - Update MongoDB (avStatus = CLEAN)
  - Allow finalization
```

---

## Prerequisites

1. **AWS Account** with GuardDuty enabled
2. **Terraform** >= 1.0
3. **AWS CLI** configured
4. **Security team email** for alerts

---

## Step 1: Deploy Infrastructure with Terraform

### 1.1 Create `terraform.tfvars`

```hcl
# apps/bff/infrastructure/terraform.tfvars

environment          = "dev"
aws_region          = "us-east-1"
security_team_email = "security@yourcompany.com"
bff_url             = "https://api.yourcompany.com"  # or http://localhost:8080 for dev
```

### 1.2 Initialize Terraform

```bash
cd apps/bff/infrastructure

terraform init
```

### 1.3 Plan Deployment

```bash
terraform plan
```

Review the resources that will be created:
- GuardDuty detector
- S3 buckets (documents + quarantine)
- EventBridge rule
- Lambda function
- SNS topic
- IAM roles and policies

### 1.4 Deploy

```bash
terraform apply
```

Type `yes` to confirm.

### 1.5 Confirm SNS Subscription

You'll receive an email at `security_team_email`:
- Subject: **AWS Notification - Subscription Confirmation**
- Click the confirmation link

---

## Step 2: Enable GuardDuty S3 Protection

GuardDuty must be configured to scan your S3 bucket:

```bash
# Get your GuardDuty detector ID
DETECTOR_ID=$(terraform output -raw guardduty_detector_id)

# Enable S3 protection for the documents bucket
BUCKET_NAME=$(terraform output -raw documents_bucket_name)

aws guardduty update-malware-scan-settings \
  --detector-id $DETECTOR_ID \
  --scan-resource-criteria \
    "include={\"mapEquals\":[{\"key\":\"S3_BUCKET_NAME\",\"value\":\"$BUCKET_NAME\"}]}"
```

Or via AWS Console:
1. Go to **GuardDuty** → **Settings** → **Malware Protection**
2. Click **Enable Malware Protection for S3**
3. Select your bucket: `hs-documents-dev`
4. Click **Enable**

---

## Step 3: Update BFF Configuration

### 3.1 Update `application.yml`

```yaml
aws:
  s3:
    documents:
      bucket: hs-documents-dev  # Use Terraform output
      region: us-east-1
```

### 3.2 Verify Callback Endpoint

Ensure the callback endpoint is accessible:

```bash
# Test locally
curl -X POST http://localhost:8080/api/documents/av-callback \
  -H "Content-Type: application/json" \
  -d '{
    "tempS3Key": "temp/test/file.pdf",
    "avStatus": "clean",
    "scannedAt": "2024-01-01T12:00:00Z"
  }'
```

---

## Step 4: Test the Integration

### 4.1 Upload a Test File

```bash
# Upload a clean file
aws s3 cp test.pdf s3://hs-documents-dev/temp/test-session/test.pdf
```

### 4.2 Upload EICAR Test File (Safe Malware Test)

```bash
# Create EICAR test file (standard malware test file - not actually harmful)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Upload to S3
aws s3 cp eicar.txt s3://hs-documents-dev/temp/test-session/eicar.txt
```

**Expected Behavior:**
1. GuardDuty detects it within 30-60 seconds
2. Lambda function is triggered
3. File is moved to quarantine bucket
4. Original file is deleted
5. You receive an email alert
6. MongoDB updated with `avStatus = INFECTED`

### 4.3 Check Lambda Logs

```bash
# Get Lambda function name
LAMBDA_NAME=$(terraform output -raw lambda_function_name)

# View logs
aws logs tail /aws/lambda/$LAMBDA_NAME --follow
```

### 4.4 Verify Quarantine

```bash
QUARANTINE_BUCKET=$(terraform output -raw quarantine_bucket_name)

# List quarantined files
aws s3 ls s3://$QUARANTINE_BUCKET/quarantine/ --recursive
```

---

## Step 5: Monitor and Maintain

### 5.1 CloudWatch Dashboard

Create a dashboard to monitor malware detections:

1. Go to **CloudWatch** → **Dashboards**
2. Create new dashboard: `Document-Malware-Protection`
3. Add widgets:
   - GuardDuty findings (metric: `GuardDutyFinding`)
   - Lambda invocations
   - Lambda errors
   - S3 quarantine bucket size

### 5.2 Set Up Alarms

```bash
# Alarm for multiple malware detections
aws cloudwatch put-metric-alarm \
  --alarm-name "high-malware-detection-rate" \
  --alarm-description "Alert if >5 malware detections in 5 minutes" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions <SNS_TOPIC_ARN>
```

### 5.3 Review Quarantine Regularly

Set up a weekly review process:

```bash
# List all quarantined files this week
aws s3api list-objects-v2 \
  --bucket $QUARANTINE_BUCKET \
  --prefix "quarantine/" \
  --query "Contents[?LastModified>='2024-01-01'].{Key:Key,Size:Size,Modified:LastModified}"
```

---

## Cost Estimates

### GuardDuty S3 Protection Pricing

| Volume | Monthly Scans | Cost @ $0.50/GB |
|--------|---------------|-----------------|
| 100 files × 5 MB | 500 MB | $0.25 |
| 1,000 files × 5 MB | 5 GB | $2.50 |
| 10,000 files × 5 MB | 50 GB | $25.00 |
| 100,000 files × 5 MB | 500 GB | $250.00 |

### Additional AWS Costs

- **Lambda**: ~$0.20/month (1M invocations free tier)
- **S3 Storage**: ~$0.023/GB/month
- **SNS**: First 1,000 emails free, then $2 per 100,000
- **EventBridge**: Free (within limits)

**Total Estimated Cost for 1,000 users:**
- 1,000 users × 5 files/month × 5 MB = 25 GB scanned
- Cost: **$2.50 - $5.00/month**

---

## Troubleshooting

### Issue: GuardDuty Not Detecting Files

**Check:**
1. GuardDuty is enabled for S3
2. Bucket is in the scan list
3. S3 versioning is enabled
4. Lambda has correct permissions

```bash
# Verify GuardDuty status
aws guardduty get-detector --detector-id $DETECTOR_ID

# Check malware scan settings
aws guardduty get-malware-scan-settings --detector-id $DETECTOR_ID
```

### Issue: Lambda Not Triggering

**Check:**
1. EventBridge rule is enabled
2. Lambda has EventBridge invoke permission
3. Check CloudWatch Logs for errors

```bash
# Test EventBridge rule
aws events test-event-pattern \
  --event-pattern file://event-pattern.json \
  --event file://test-event.json
```

### Issue: BFF Callback Failing

**Check:**
1. BFF is running and accessible
2. Security group allows Lambda → BFF traffic
3. Check Lambda logs for HTTP errors

```bash
# Test connectivity from Lambda VPC (if using VPC)
# Create a test Lambda to curl the BFF
```

### Issue: Files Not Being Quarantined

**Check Lambda logs:**

```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/$LAMBDA_NAME \
  --filter-pattern "ERROR"
```

---

## Security Best Practices

### 1. Least Privilege IAM

The Terraform configuration already implements least privilege. Verify:

```bash
# Review Lambda IAM policy
aws iam get-role-policy \
  --role-name guardduty-malware-handler-dev \
  --policy-name guardduty-lambda-policy
```

### 2. Encrypt Quarantine Bucket

Already enabled via Terraform (SSE-S3). For stricter compliance, use KMS:

```hcl
# In guardduty-s3-protection.tf
resource "aws_s3_bucket_server_side_encryption_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.documents.id
    }
  }
}
```

### 3. Access Logging

Enable access logs for audit trail:

```hcl
resource "aws_s3_bucket_logging" "documents" {
  bucket = aws_s3_bucket.documents.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "documents-access-logs/"
}
```

### 4. MFA Delete

For production, enable MFA delete on quarantine bucket:

```bash
aws s3api put-bucket-versioning \
  --bucket $QUARANTINE_BUCKET \
  --versioning-configuration Status=Enabled,MFADelete=Enabled \
  --mfa "arn:aws:iam::ACCOUNT:mfa/root-account-mfa-device XXXXXX"
```

---

## Compliance

### HIPAA

GuardDuty is HIPAA eligible. Ensure:
- ✅ S3 encryption enabled (done)
- ✅ Access logging enabled
- ✅ MFA delete for quarantine
- ✅ Regular audit of quarantined files
- ✅ Documented incident response process

### PCI DSS

- ✅ Malware protection (Requirement 5)
- ✅ Audit trails (Requirement 10)
- ✅ Encrypted storage (Requirement 3)

---

## Disaster Recovery

### Backup Terraform State

```bash
# Backup state to S3
terraform state push

# Or use S3 backend (recommended)
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "guardduty/terraform.tfstate"
    region = "us-east-1"
  }
}
```

### Document Incident Response

1. **Malware Detected:**
   - File automatically quarantined ✓
   - Security team notified ✓
   - User upload blocked ✓
   - Action: Review user activity, consider account suspension

2. **Mass Upload Attack:**
   - Lambda auto-scales ✓
   - Action: Review CloudWatch metrics, consider rate limiting

3. **GuardDuty Service Outage:**
   - Fallback: Block all uploads until service restored
   - Action: Monitor AWS Service Health Dashboard

---

## Cleanup (For Testing)

To tear down the infrastructure:

```bash
cd apps/bff/infrastructure

# Destroy resources
terraform destroy
```

**Warning:** This will delete:
- S3 buckets (including quarantined files!)
- Lambda function
- EventBridge rules
- SNS topic

---

## Support

- **AWS GuardDuty Docs:** https://docs.aws.amazon.com/guardduty/
- **GuardDuty Pricing:** https://aws.amazon.com/guardduty/pricing/
- **Terraform AWS Provider:** https://registry.terraform.io/providers/hashicorp/aws/

---

## Next Steps

After deployment:

1. ✅ Test with EICAR file
2. ✅ Verify email alerts work
3. ✅ Monitor costs in AWS Cost Explorer
4. ✅ Train security team on incident response
5. ✅ Document in runbook
6. ✅ Schedule weekly quarantine reviews

**Your document upload system is now protected! 🛡️**
