
###############################################################################
# GNEW • N255
# Multicloud Private Connectivity (AWS + GCP)
# - Establishes secure private service connectivity across clouds
# - VPC Peering / Interconnect abstraction
# - CI/CD ready, tagged consistently
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws    = { source = "hashicorp/aws",    version = ">= 5.0" }
    google = { source = "hashicorp/google", version = ">= 5.10" }
  }
}

###############################################################################
# Variables
###############################################################################

variable "env"         { type = string; description = "Environment"; default = "prod" }
variable "name"        { type = string; description = "Base name"; default = "gnew-private-link" }

# AWS
variable "aws_region"  { type = string; description = "AWS region"; default = "eu-west-1" }
variable "aws_vpc_id"  { type = string; description = "AWS VPC ID" }

# GCP
variable "gcp_project" { type = string; description = "GCP project id" }
variable "gcp_region"  { type = string; description = "GCP region"; default = "europe-west1" }
variable "gcp_network" { type = string; description = "GCP network name" }

locals {
  tags = {
    project     = "GNEW"
    component   = "multicloud-private-link"
    environment = var.env
  }
}

###############################################################################
# AWS VPC Endpoint (Interface type for private services)
###############################################################################

resource "aws_vpc_endpoint" "gnew_service" {
  vpc_id            = var.aws_vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Interface"

  security_group_ids = []
  subnet_ids         = [] # populate in stack usage

  private_dns_enabled = true
  tags                = local.tags
}

###############################################################################
# GCP Private Service Connect Endpoint
###############################################################################

resource "google_compute_global_address" "psc_address" {
  name          = "${var.name}-${var.env}-psc-ip"
  project       = var.gcp_project
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  network       = var.gcp_network
}

resource "google_service_networking_connection" "psc_connection" {
  network                 = var.gcp_network
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psc_address.name]
}

###############################################################################
# Cross-Cloud Connectivity Placeholder
###############################################################################
# NOTE: Full AWS<->GCP private interconnect requires Direct Connect + Interconnect.
# Here we define placeholders for consistency; extended infra can attach here.

resource "aws_vpc_peering_connection" "to_gcp_placeholder" {
  vpc_id        = var.aws_vpc_id
  peer_vpc_id   = "gcp-mapped-vpc-id" # to be mapped in infra orchestration
  peer_region   = var.aws_region
  auto_accept   = false
  tags          = local.tags
}

###############################################################################
# Outputs
###############################################################################

output "aws_vpc_endpoint_id" {
  value       = aws_vpc_endpoint.gnew_service.id
  description = "AWS VPC Endpoint ID"
}

output "gcp_psc_address" {
  value       = google_compute_global_address.psc_address.address
  description = "GCP PSC reserved internal address"
}

output "gcp_psc_connection" {
  value       = google_service_networking_connection.psc_connection.network
  description = "GCP PSC connection network"
}


✔️ Explicación del artefacto (N255)

Configura conectividad privada multicloud.

AWS: VPC Endpoint para servicios privados (ej. S3).

GCP: Private Service Connect (PSC) + VPC peering reservado.

Incluye placeholder de VPC peering cross-cloud, ampliable a Direct Connect / Interconnect.

Todo está alineado con etiquetas, CI/CD y seguridad consistente.

👉 En la próxima ejecución avanzaré a N256.

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus
Pensó durante 2m 20s

