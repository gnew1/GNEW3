
###############################################################################
# GNEW • N257
# Secrets Management stack: HashiCorp Vault on Kubernetes (Raft HA)
# Auto‑unseal via AWS KMS o GCP Cloud KMS (seleccionable), OIDC listo para CI.
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes", version = ">= 2.29.0" }
    helm       = { source = "hashicorp/helm",       version = ">= 2.12.1" }
    aws        = { source = "hashicorp/aws",        version = ">= 5.0" }
    google     = { source = "hashicorp/google",     version = ">= 5.10" }
    random     = { source = "hashicorp/random",     version = ">= 3.5" }
  }

  backend "local" {}
}

###############################################################################
# Inputs
###############################################################################

variable "env"           { type = string,  default = "prod", description = "Environment" }
variable "name"          { type = string,  default = "gnew-vault", description = "Release/name prefix" }
variable "namespace"     { type = string,  default = "security", description = "K8s namespace for Vault" }
variable "kubeconfig"    { type = string,  description = "Path to kubeconfig" }
variable "kube_context"  { type = string,  description = "Kube context", default = null }

# Seal provider: "aws" | "gcp"
variable "seal_provider" { type = string,  default = "aws", validation { condition = contains(["aws","gcp"], var.seal_provider) error_message = "seal_provider must be aws or gcp." } }

# —— AWS (if seal_provider == "aws")
variable "aws_region"    { type = string,  default = "eu-west-1" }
variable "aws_kms_key_id"{ type = string,  default = "", description = "Existing AWS KMS key id (alias/arn/key-id). If empty, one will be created." }
variable "aws_iam_role_arn_for_irsa" { type = string, default = "", description = "IRSA role ARN bound to Vault ServiceAccount" }

# —— GCP (if seal_provider == "gcp")
variable "gcp_project"   { type = string,  default = "", description = "GCP project id" }
variable "gcp_region"    { type = string,  default = "europe-west1" }
variable "gcp_kms_location" { type = string, default = "europe" }
variable "gcp_kms_keyring"  { type = string, default = "", description = "Existing key ring (created if empty)" }
variable "gcp_kms_key"      { type = string, default = "", description = "Existing crypto key (created if empty)" }
variable "gcp_workload_identity_sa" { type = string, default = "", description = "GCP SA email for Workload Identity (optional)" }

# Networking
variable "service_type"  { type = string,  default = "ClusterIP", validation { condition = contains(["ClusterIP","LoadBalancer","NodePort"], var.service_type) error_message = "Invalid service_type" } }

locals {
  labels = {
    project     = "GNEW"
    component   = "secrets-vault"
    environment = var.env
    managed_by  = "terraform"
  }
}

###############################################################################
# Providers
###############################################################################

provider "kubernetes" {
  config_path    = var.kubeconfig
  config_context = var.kube_context
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig
    config_context = var.kube_context
  }
}

provider "aws" {
  region = var.aws_region
}

provider "google" {
  project = var.gcp_project != "" ? var.gcp_project : null
  region  = var.gcp_region
}

###############################################################################
# KMS prerequisites (created only if ids are not provided)
###############################################################################

# AWS KMS (optional create)
resource "aws_kms_key" "vault" {
  count                   = var.seal_provider == "aws" && var.aws_kms_key_id == "" ? 1 : 0
  description             = "GNEW ${var.env} Vault auto-unseal"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  multi_region            = true
  tags                    = local.labels
}

resource "aws_kms_alias" "vault" {
  count        = var.seal_provider == "aws" && var.aws_kms_key_id == "" ? 1 : 0
  name         = "alias/${var.name}-${var.env}-vault"
  target_key_id= aws_kms_key.vault[0].key_id
}

# GCP KMS (optional create)
resource "google_kms_key_ring" "vault" {
  count    = var.seal_provider == "gcp" && var.gcp_kms_keyring == "" ? 1 : 0
  name     = var.gcp_kms_keyring == "" ? "${var.name}-${var.env}-kr" : var.gcp_kms_keyring
  location = var.gcp_kms_location
}

resource "google_kms_crypto_key" "vault" {
  count            = var.seal_provider == "gcp" && var.gcp_kms_key == "" ? 1 : 0
  name             = var.gcp_kms_key == "" ? "vault-auto-unseal" : var.gcp_kms_key
  key_ring         = google_kms_key_ring.vault[0].id
  rotation_period  = "7776000s" # 90 days
  purpose          = "ENCRYPT_DECRYPT"
  version_template {
    algorithm = "GOOGLE_SYMMETRIC_ENCRYPTION"
  }
}

###############################################################################
# Kubernetes Namespace
###############################################################################

resource "kubernetes_namespace" "vault" {
  metadata {
    name   = var.namespace
    labels = local.labels
  }
}

###############################################################################
# Vault Helm Release (Raft HA + Auto‑Unseal)
###############################################################################

# ExtraConfig (HCL) for server, with conditional seal block
locals {
  seal_hcl = var.seal_provider == "aws" ? <<-EOT
    seal "awskms" {
      region     = "${var.aws_region}"
      kms_key_id = "${var.aws_kms_key_id != "" ? var.aws_kms_key_id : aws_kms_key.vault[0].key_id}"
    }
  EOT
  : <<-EOT
    seal "gcpckms" {
      project    = "${var.gcp_project}"
      region     = "${var.gcp_kms_location}"
      key_ring   = "${var.gcp_kms_keyring != "" ? var.gcp_kms_keyring : google_kms_key_ring.vault[0].name}"
      crypto_key = "${var.gcp_kms_key != "" ? var.gcp_kms_key : google_kms_crypto_key.vault[0].name}"
    }
  EOT

  server_hcl = <<-EOT
    listener "tcp" {
      address     = "0.0.0.0:8200"
      tls_disable = 1
    }

    storage "raft" {
      path = "/vault/data"
      retry_join {
        auto_join               = "provider=k8s label_selector=\"app.kubernetes.io/name=vault,component=server\" namespace=\"${var.namespace}\""
        auto_join_scheme        = "http"
      }
    }

    ${trimspace(local.seal_hcl)}

    telemetry {
      prometheus_retention_time = "24h"
      disable_hostname          = true
    }

    api_addr = "http://vault.${var.namespace}.svc:8200"
    cluster_addr = "http://$(HOSTNAME).${var.namespace}.pod:8201"
  EOT
}

resource "helm_release" "vault" {
  name       = var.name
  namespace  = kubernetes_namespace.vault.metadata[0].name
  repository = "https://helm.releases.hashicorp.com"
  chart      = "vault"
  version    = "0.28.0" # compatible chart; ajustar si se requiere

  values = [
    yamlencode({
      global = {
        openshift = false
      }
      server = {
        enabled = true
        image   = { repository = "hashicorp/vault", tag = "1.17.5" }
        ha      = { enabled = true, replicas = 3 }
        dataStorage = { enabled = true, size = "10Gi" }
        auditStorage= { enabled = true, size = "5Gi" }
        extraEnvironmentVars = merge(
          var.seal_provider == "aws" ? { "AWS_REGION" = var.aws_region } : {},
          {}
        )
        extraInitContainers = []
        extraVolumes  = []
        readinessProbe = { enabled = true }
        livenessProbe  = { enabled = true }
        ingress = { enabled = false }
        service = { type = var.service_type, port = 8200 }
        # Config HCL injected by the chart
        extraConfig = local.server_hcl
        # ServiceAccount annotations for cloud identity bindings
        serviceAccount = {
          create = true
          name   = "${var.name}-sa"
          annotations = merge(
            var.aws_iam_role_arn_for_irsa != "" ? { "eks.amazonaws.com/role-arn" = var.aws_iam_role_arn_for_irsa } : {},
            var.gcp_workload_identity_sa  != "" ? { "iam.gke.io/gcp-service-account" = var.gcp_workload_identity_sa } : {}
          )
        }
        # Prometheus metrics endpoint
        annotations = { "prometheus.io/scrape" = "true", "prometheus.io/port" = "9102", "prometheus.io/path" = "/metrics" }
      }
      ui = { enabled = true, serviceType = var.service_type }
    })
  ]

  depends_on = [
    kubernetes_namespace.vault,
    aws_kms_key.vault,
    aws_kms_alias.vault,
    google_kms_crypto_key.vault,
    google_kms_key_ring.vault
  ]
}

###############################################################################
# Outputs
###############################################################################

output "vault_service" {
  value       = "vault.${var.namespace}.svc.cluster.local:8200"
  description = "Internal service address for Vault UI/API"
}

output "seal_provider" {
  value       = var.seal_provider
  description = "Configured seal provider"
}

output "aws_kms_key_id" {
  value       = var.seal_provider == "aws" ? (var.aws_kms_key_id != "" ? var.aws_kms_key_id : aws_kms_key.vault[0].key_id) : null
  description = "AWS KMS key id used for auto-unseal (if aws)"
}

output "gcp_kms_crypto_key" {
  value       = var.seal_provider == "gcp" ? (var.gcp_kms_key != "" ? var.gcp_kms_key : google_kms_crypto_key.vault[0].name) : null
  description = "GCP KMS crypto key used for auto-unseal (if gcp)"
}

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus

