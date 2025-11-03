variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "create_route53_zone" {
  description = "Whether to create a Route53 hosted zone"
  type        = bool
  default     = true
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# ECS Configuration
variable "ecs_cpu" {
  description = "Fargate task CPU"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate task memory"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 2
}

# Database Configuration
variable "db_master_username" {
  description = "DocumentDB master username"
  type        = string
  sensitive   = true
}

variable "db_master_password" {
  description = "DocumentDB master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_instance_count" {
  description = "Number of DocumentDB instances"
  type        = number
  default     = 2
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 2
}
