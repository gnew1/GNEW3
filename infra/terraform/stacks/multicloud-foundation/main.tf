
###############################################################################
# GNEW • Multicloud Foundation (N251)
# Terraform root module that establishes:
#  - GitHub Actions OIDC federation to AWS & GCP (no long‑lived secrets)
#  - Minimal networking (AWS VPC + GCP VPC)
#  - KMS primitives in both clouds (for artifact signing/encryption)
# Notes:
#  - Backend is set to local by default. Use -backend-config to switch to S3 or GCS.
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws    = { source = "hashicorp/aws",    version = ">= 5.0" }
    google = { source = "hashicorp/google", version = ">= 5.10" }
    random = { source = "hashicorp/random", version = ">= 3.5" }
    tls    = { source = "hashicorp/tls",    version = ">= 4.0" }
  }

  # Default to local; override in init with -backend-config.
  backend "local" {
    path = "terraform.tfstate"
  }

  # Examples:
  # backend "s3" {
  #   bucket = "gnew-tfstate-prod"
  #   key    = "multicloud/foundation/terraform.tfstate"
  #   region = "eu-west-1"
  #   dynamodb_table = "gnew-tf-locks"
  #   encrypt = true
  # }
  # backend "gcs" {
  #   bucket = "gnew-tfstate-prod"
  #   prefix = "multicloud/foundation"
  # }
}

###############################################################################
# Variables
###############################################################################

variable "name"         { description = "Stack name"; type = string; default = "gnew-foundation" }
variable "env"          { description = "Environment"; type = string; default = "prod" }

# GitHub repo that will be allowed to assume identities via OIDC/WIF
variable "github_owner" { description = "GitHub org/user"; type = string }
variable "github_repo"  { description = "GitHub repo name"; type = string }
variable "github_branch_pattern" {
  description = "Allowed branch ref pattern for CI (e.g., refs/heads/main or refs/heads/*)"
  type        = string
  default     = "refs/heads/main"
}

# AWS
variable "aws_region"     { description = "AWS region"; type = string; default = "eu-west-1" }
variable "aws_account_id" { description = "AWS account id"; type = string }

# GCP
variable "gcp_project" { description = "GCP project id"; type = string }
variable "gcp_region"  { description = "GCP region"; type = string; default = "europe-west1" }
variable "gcp_location"{ description = "GCP KMS location"; type = string; default = "europe" }

locals {
  tags = {
    project     = "GNEW"
    component   = "multicloud-foundation"
    environment = var.env
    owner       = var.github_owner
  }
  gh_oidc_url     = "https://token.actions.githubusercontent.com"
  gh_full_repo    = "${var.github_owner}/${var.github_repo}"
  gh_sub_selector = "repo:${local.gh_full_repo}:ref:${var.github_branch_pattern}"
}

###############################################################################
# Providers
###############################################################################

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

###############################################################################
# —— AWS: OIDC for GitHub Actions + minimal networking + KMS
###############################################################################

# Thumbprint for GitHub OIDC (fetched dynamically to avoid hardcoding root CA)
data "tls_certificate" "github_oidc" {
  url = local.gh_oidc_url
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = local.gh_oidc_url
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github_oidc.certificates[0].sha1_fingerprint]
}

data "aws_iam_policy_document" "gha_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.gh_sub_selector]
    }
  }
}

resource "aws_iam_role" "gha_deploy" {
  name               = "${var.name}-${var.env}-gha"
  assume_role_policy = data.aws_iam_policy_document.gha_assume_role.json
  description        = "GitHub Actions deploy role for ${local.gh_full_repo}"
  inline_policy {
    name = "tf-deploy-minimal"
    policy = jsonencode({
      Version = "2012-10-17",
      Statement = [
        { Effect="Allow", Action=[
            "sts:GetCallerIdentity"
          ], Resource="*"
        },
        { Effect="Allow", Action=[
            "kms:Encrypt","kms:Decrypt","kms:GenerateDataKey*","kms:DescribeKey"
          ], Resource="*"
        },
        { Effect="Allow", Action=[
            "ec2:Describe*","iam:List*","iam:Get*","s3:ListAllMyBuckets","s3:GetBucketLocation"
          ], Resource="*"
        }
      ]
    })
  }
  tags = local.tags
}

# Minimal networking in AWS
resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = merge(local.tags, { Name = "${var.name}-${var.env}-vpc" })
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.0.0/20"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags                    = merge(local.tags, { Name = "${var.name}-${var.env}-subnet-a" })
}

resource "aws_kms_key" "primary" {
  description             = "GNEW ${var.env} primary KMS"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  multi_region            = true
  tags                    = local.tags
}

resource "aws_kms_alias" "primary" {
  name          = "alias/${var.name}-${var.env}-primary"
  target_key_id = aws_kms_key.primary.key_id
}

###############################################################################
# —— GCP: Workload Identity Federation + minimal networking + KMS
###############################################################################

resource "google_service_account" "gha" {
  account_id   = "gha-${var.env}"
  display_name = "GitHub Actions ${var.env} deploy"
}

# Workload Identity Pool
resource "google_iam_workload_identity_pool" "pool" {
  workload_identity_pool_id = "gnew-gha-${var.env}"
  display_name              = "GNEW GHA ${var.env}"
  description               = "OIDC pool for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"
  oidc {
    issuer_uri        = local.gh_oidc_url
    allowed_audiences = ["sts.googleapis.com"]
  }
  attribute_condition = "assertion.repository == \"${local.gh_full_repo}\" && assertion.ref == \"${var.github_branch_pattern}\""
  attribute_mapping = {
    "google.subject" = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
}

# Allow pool identities to impersonate the SA
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.gha.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.pool.name}/attribute.repository/${local.gh_full_repo}"
}

# Minimal GCP network
resource "google_compute_network" "vpc" {
  name                    = "${var.name}-${var.env}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${var.name}-${var.env}-subnet-a"
  ip_cidr_range = "10.30.0.0/20"
  region        = var.gcp_region
  network       = google_compute_network.vpc.id
}

# GCP KMS
resource "google_kms_key_ring" "kr" {
  name     = "${var.name}-${var.env}-kr"
  location = var.gcp_location
}

resource "google_kms_crypto_key" "primary" {
  name            = "primary"
  key_ring        = google_kms_key_ring.kr.id
  rotation_period = "7776000s" # 90 days
  purpose         = "ENCRYPT_DECRYPT"
}

###############################################################################
# Outputs
###############################################################################

output "aws_role_arn" {
  description = "AWS IAM role to be assumed by GitHub Actions"
  value       = aws_iam_role.gha_deploy.arn
}

output "aws_kms_key_arn" {
  value       = aws_kms_key.primary.arn
  description = "AWS primary KMS key ARN"
}

output "gcp_service_account_email" {
  value       = google_service_account.gha.email
  description = "GCP service account for GitHub Actions"
}

output "gcp_wif_provider_name" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full name of Workload Identity Federation provider"
}

output "aws_vpc_id" {
  value       = aws_vpc.main.id
  description = "AWS VPC id"
}

output "gcp_network_name" {
  value       = google_compute_network.vpc.name
  description = "GCP VPC name"
}

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus

