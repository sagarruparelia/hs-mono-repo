# AWS GuardDuty S3 Malware Protection
# Automatically scans files uploaded to S3 for malware
# Results published to EventBridge → Lambda → BFF callback

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "bff_url" {
  description = "BFF base URL for callbacks"
  type        = string
  default     = "http://localhost:8080"
}

variable "security_team_email" {
  description = "Email for malware alerts"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# ============================================================================
# 1. GuardDuty Detector with S3 Protection
# ============================================================================

resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }

    kubernetes {
      audit_logs {
        enable = false
      }
    }

    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = false  # Not needed for S3-only protection
        }
      }
    }
  }

  tags = {
    Name        = "hs-documents-guardduty"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================================
# 2. S3 Buckets
# ============================================================================

# Main documents bucket
resource "aws_s3_bucket" "documents" {
  bucket = "hs-documents-${var.environment}"

  tags = {
    Name        = "HS Documents"
    Environment = var.environment
    GuardDuty   = "enabled"
  }
}

# Enable versioning (required for GuardDuty)
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.documents.id
    }
    bucket_key_enabled = true
  }
}

# KMS key for encryption
resource "aws_kms_key" "documents" {
  description             = "KMS key for documents encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "hs-documents-kms"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "documents" {
  name          = "alias/hs-documents-${var.environment}"
  target_key_id = aws_kms_key.documents.key_id
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Quarantine bucket for infected files
resource "aws_s3_bucket" "quarantine" {
  bucket = "hs-documents-quarantine-${var.environment}"

  tags = {
    Name        = "HS Documents Quarantine"
    Environment = var.environment
    Purpose     = "malware-quarantine"
  }
}

resource "aws_s3_bucket_versioning" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle policy for quarantine bucket
resource "aws_s3_bucket_lifecycle_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id

  rule {
    id     = "delete-old-quarantined-files"
    status = "Enabled"

    expiration {
      days = 90  # Delete after 90 days
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ============================================================================
# 3. EventBridge Rule for GuardDuty Findings
# ============================================================================

resource "aws_cloudwatch_event_rule" "guardduty_malware_findings" {
  name        = "guardduty-s3-malware-findings-${var.environment}"
  description = "Capture GuardDuty S3 malware findings"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
    detail = {
      type = [
        {
          prefix = "Execution:S3/MaliciousFile"
        },
        {
          prefix = "Execution:S3/"
        }
      ]
      severity = [
        { numeric = [">=", 4] }  # Medium severity and above
      ]
    }
  })

  tags = {
    Name        = "guardduty-malware-rule"
    Environment = var.environment
  }
}

# Target: Lambda function
resource "aws_cloudwatch_event_target" "guardduty_lambda" {
  rule      = aws_cloudwatch_event_rule.guardduty_malware_findings.name
  target_id = "GuardDutyMalwareHandler"
  arn       = aws_lambda_function.guardduty_malware_handler.arn
}

# ============================================================================
# 4. Lambda Function to Process GuardDuty Findings
# ============================================================================

# IAM Role for Lambda
resource "aws_iam_role" "guardduty_lambda" {
  name = "guardduty-malware-handler-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name        = "guardduty-lambda-role"
    Environment = var.environment
  }
}

# Lambda execution policy
resource "aws_iam_role_policy" "guardduty_lambda_policy" {
  name = "guardduty-lambda-policy"
  role = aws_iam_role.guardduty_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectTagging",
          "s3:PutObject",
          "s3:PutObjectTagging",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.documents.arn}/*",
          "${aws_s3_bucket.quarantine.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.malware_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.documents.arn
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "guardduty_malware_handler" {
  filename      = "${path.module}/lambda/guardduty-handler.zip"
  function_name = "guardduty-malware-handler-${var.environment}"
  role          = aws_iam_role.guardduty_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60
  memory_size   = 256

  environment {
    variables = {
      DOCUMENTS_BUCKET  = aws_s3_bucket.documents.id
      QUARANTINE_BUCKET = aws_s3_bucket.quarantine.id
      SNS_TOPIC_ARN     = aws_sns_topic.malware_alerts.arn
      BFF_CALLBACK_URL  = var.bff_url
      ENVIRONMENT       = var.environment
    }
  }

  tags = {
    Name        = "guardduty-malware-handler"
    Environment = var.environment
  }
}

# Allow EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.guardduty_malware_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.guardduty_malware_findings.arn
}

# ============================================================================
# 5. SNS Topic for Alerts
# ============================================================================

resource "aws_sns_topic" "malware_alerts" {
  name = "document-malware-alerts-${var.environment}"

  tags = {
    Name        = "malware-alerts"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "security_team_email" {
  topic_arn = aws_sns_topic.malware_alerts.arn
  protocol  = "email"
  endpoint  = var.security_team_email
}

# ============================================================================
# 6. CloudWatch Log Group
# ============================================================================

resource "aws_cloudwatch_log_group" "guardduty_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.guardduty_malware_handler.function_name}"
  retention_in_days = 30

  tags = {
    Name        = "guardduty-lambda-logs"
    Environment = var.environment
  }
}

# ============================================================================
# 7. Outputs
# ============================================================================

output "documents_bucket_name" {
  description = "S3 bucket for documents"
  value       = aws_s3_bucket.documents.id
}

output "quarantine_bucket_name" {
  description = "S3 bucket for quarantined files"
  value       = aws_s3_bucket.quarantine.id
}

output "guardduty_detector_id" {
  description = "GuardDuty detector ID"
  value       = aws_guardduty_detector.main.id
}

output "lambda_function_name" {
  description = "Lambda function for malware handling"
  value       = aws_lambda_function.guardduty_malware_handler.function_name
}

output "sns_topic_arn" {
  description = "SNS topic for malware alerts"
  value       = aws_sns_topic.malware_alerts.arn
}
