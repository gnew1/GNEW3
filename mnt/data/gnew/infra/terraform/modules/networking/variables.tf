
/**
 * GNEW Project - Networking Module Variables
 * Prompt N275
 * Consistent with Terraform best practices, security, and GNEW infra DoD
 */

variable "project" {
  description = "The name of the GNEW project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "Cloud region where resources will be deployed"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "enable_nat_gateway" {
  description = "Flag to enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to be applied to all networking resources"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "GNEW"
  }
}


✅ Estado interno actualizado: siguiente turno ejecutará N276.

