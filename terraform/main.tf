terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "hs-mono-repo-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "hs-mono-repo"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider for CloudFront (must be us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "hs-mono-repo"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Local variables
locals {
  project_name = "hs-mono-repo"
  common_tags = {
    Project     = local.project_name
    Environment = var.environment
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# S3 buckets for static hosting
module "s3_mfe_profile" {
  source = "./modules/s3-static-hosting"

  bucket_name = "${local.project_name}-mfe-profile-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

module "s3_mfe_summary" {
  source = "./modules/s3-static-hosting"

  bucket_name = "${local.project_name}-mfe-summary-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

module "s3_web_cl" {
  source = "./modules/s3-static-hosting"

  bucket_name = "${local.project_name}-web-cl-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

module "s3_web_hs" {
  source = "./modules/s3-static-hosting"

  bucket_name = "${local.project_name}-web-hs-${var.environment}"
  environment = var.environment
  tags        = local.common_tags
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-cert"
  })
}

# CloudFront distribution
module "cloudfront" {
  source = "./modules/cloudfront"

  domain_name     = var.domain_name
  certificate_arn = aws_acm_certificate.main.arn
  environment     = var.environment

  origins = {
    mfe_profile = {
      domain_name = module.s3_mfe_profile.bucket_regional_domain_name
      origin_id   = "S3-mfe-profile"
      origin_path = ""
    }
    mfe_summary = {
      domain_name = module.s3_mfe_summary.bucket_regional_domain_name
      origin_id   = "S3-mfe-summary"
      origin_path = ""
    }
    web_cl = {
      domain_name = module.s3_web_cl.bucket_regional_domain_name
      origin_id   = "S3-web-cl"
      origin_path = ""
    }
    web_hs = {
      domain_name = module.s3_web_hs.bucket_regional_domain_name
      origin_id   = "S3-web-hs"
      origin_path = ""
    }
    api = {
      domain_name = module.alb.dns_name
      origin_id   = "ALB-api"
      origin_path = ""
    }
  }

  tags = local.common_tags
}

# VPC
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  environment        = var.environment
  tags               = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"

  name               = "${local.project_name}-alb"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  certificate_arn    = aws_acm_certificate.main.arn
  environment        = var.environment
  tags               = local.common_tags
}

# ECS Cluster for Spring Boot BFF
module "ecs" {
  source = "./modules/ecs"

  cluster_name       = "${local.project_name}-cluster"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  alb_target_group_arn = module.alb.target_group_arn
  security_group_ids = [module.vpc.ecs_security_group_id]

  # Container configuration
  container_name     = "bff"
  container_image    = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${local.project_name}-bff:latest"
  container_port     = 8080
  cpu                = var.ecs_cpu
  memory             = var.ecs_memory
  desired_count      = var.ecs_desired_count

  # Environment variables
  environment_variables = [
    {
      name  = "SPRING_PROFILES_ACTIVE"
      value = var.environment
    },
    {
      name  = "SPRING_DATA_MONGODB_URI"
      value = module.documentdb.connection_string
    },
    {
      name  = "SPRING_DATA_REDIS_HOST"
      value = module.elasticache.endpoint
    }
  ]

  tags = local.common_tags
}

# DocumentDB (MongoDB-compatible)
module "documentdb" {
  source = "./modules/documentdb"

  cluster_identifier = "${local.project_name}-docdb"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.database_subnet_ids
  master_username    = var.db_master_username
  master_password    = var.db_master_password
  instance_class     = var.db_instance_class
  instance_count     = var.db_instance_count
  environment        = var.environment
  tags               = local.common_tags
}

# ElastiCache (Redis)
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id         = "${local.project_name}-redis"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.database_subnet_ids
  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_nodes
  environment        = var.environment
  tags               = local.common_tags
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "bff" {
  name                 = "${local.project_name}-bff"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-bff-ecr"
  })
}

# Route53 DNS
resource "aws_route53_zone" "main" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name

  tags = merge(local.common_tags, {
    Name = "${local.project_name}-zone"
  })
}

resource "aws_route53_record" "main" {
  count   = var.create_route53_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  count   = var.create_route53_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.distribution_domain_name
    zone_id                = module.cloudfront.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.project_name}-bff"
  retention_in_days = 30

  tags = local.common_tags
}

# Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "s3_bucket_mfe_profile" {
  description = "S3 bucket name for Profile MFE"
  value       = module.s3_mfe_profile.bucket_name
}

output "s3_bucket_mfe_summary" {
  description = "S3 bucket name for Summary MFE"
  value       = module.s3_mfe_summary.bucket_name
}

output "s3_bucket_web_cl" {
  description = "S3 bucket name for Web CL"
  value       = module.s3_web_cl.bucket_name
}

output "s3_bucket_web_hs" {
  description = "S3 bucket name for Web HS"
  value       = module.s3_web_hs.bucket_name
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.alb.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for BFF"
  value       = aws_ecr_repository.bff.repository_url
}
