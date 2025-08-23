
###############################################################################
# GNEW • N262
# Multicloud Monitoring & Alerting (Prometheus + Grafana + Alertmanager)
# - Despliega stack en Kubernetes via Helm
# - Integra métricas de AWS CloudWatch y GCP Monitoring
# - Reglas de alertas críticas (CPU, memoria, disco, disponibilidad)
# - Exporta métricas para integración futura con GNEW DAO
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    helm       = { source = "hashicorp/helm",       version = ">= 2.12.1" }
    kubernetes = { source = "hashicorp/kubernetes", version = ">= 2.29.0" }
    aws        = { source = "hashicorp/aws",        version = ">= 5.0" }
    google     = { source = "hashicorp/google",     version = ">= 5.10" }
  }
}

###############################################################################
# Variables
###############################################################################

variable "namespace"     { type = string, default = "monitoring" }
variable "env"           { type = string, default = "prod" }
variable "aws_region"    { type = string, default = "eu-west-1" }
variable "gcp_project"   { type = string, default = "" }
variable "grafana_admin_password" { type = string, default = "ChangeMe123!" }

locals {
  labels = {
    project     = "GNEW"
    component   = "monitoring"
    environment = var.env
    managed-by  = "terraform"
  }
}

###############################################################################
# Providers
###############################################################################

provider "kubernetes" {}
provider "helm" {}

provider "aws" {
  region = var.aws_region
}

provider "google" {
  project = var.gcp_project != "" ? var.gcp_project : null
}

###############################################################################
# Namespace
###############################################################################

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name   = var.namespace
    labels = local.labels
  }
}

###############################################################################
# Prometheus Stack (kube-prometheus-stack)
###############################################################################

resource "helm_release" "kube_prometheus_stack" {
  name       = "prom-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "61.2.0"

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention  = "15d"
          resources  = {
            requests = { cpu = "200m", memory = "512Mi" }
            limits   = { cpu = "1", memory = "2Gi" }
          }
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues     = false
        }
      }
      alertmanager = {
        alertmanagerSpec = {
          replicas = 2
          resources = {
            requests = { cpu = "100m", memory = "256Mi" }
            limits   = { cpu = "500m", memory = "512Mi" }
          }
        }
      }
      grafana = {
        adminPassword = var.grafana_admin_password
        defaultDashboardsEnabled = true
        persistence = { enabled = true, size = "5Gi" }
        service = { type = "ClusterIP" }
      }
    })
  ]
}

###############################################################################
# CloudWatch Exporter (AWS)
###############################################################################

resource "helm_release" "cloudwatch_exporter" {
  count      = var.aws_region != "" ? 1 : 0
  name       = "cloudwatch-exporter"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-cloudwatch-exporter"
  version    = "0.25.0"

  values = [
    yamlencode({
      region = var.aws_region
      resources = {
        requests = { cpu = "50m", memory = "128Mi" }
        limits   = { cpu = "200m", memory = "256Mi" }
      }
    })
  ]
}

###############################################################################
# Stackdriver Exporter (GCP)
###############################################################################

resource "helm_release" "stackdriver_exporter" {
  count      = var.gcp_project != "" ? 1 : 0
  name       = "stackdriver-exporter"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-stackdriver-exporter"
  version    = "4.0.2"

  values = [
    yamlencode({
      stackdriver = {
        projectId = var.gcp_project
      }
      resources = {
        requests = { cpu = "50m", memory = "128Mi" }
        limits   = { cpu = "200m", memory = "256Mi" }
      }
    })
  ]
}

###############################################################################
# Critical Alerts (PrometheusRule)
###############################################################################

resource "kubernetes_manifest" "critical_alerts" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "critical-alerts"
      namespace = var.namespace
      labels    = local.labels
    }
    spec = {
      groups = [
        {
          name = "critical.rules"
          rules = [
            {
              alert = "HighCPULoad"
              expr  = "instance:node_cpu_utilisation:rate5m > 0.9"
              for   = "5m"
              labels = { severity = "critical" }
              annotations = {
                summary     = "Node CPU usage > 90%"
                description = "CPU usage is above 90% for more than 5m."
              }
            },
            {
              alert = "HighMemoryUsage"
              expr  = "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1"
              for   = "5m"
              labels = { severity = "critical" }
              annotations = {
                summary     = "Node memory < 10% available"
                description = "Less than 10% memory available."
              }
            },
            {
              alert = "DiskFull"
              expr  = "node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"} < 0.1"
              for   = "10m"
              labels = { severity = "critical" }
              annotations = {
                summary     = "Root disk < 10% free"
                description = "Root disk has less than 10% free space."
              }
            }
          ]
        }
      ]
    }
  }
}

###############################################################################
# Outputs
###############################################################################

output "grafana_url" {
  value       = "http://prom-stack-grafana.${var.namespace}.svc.cluster.local:80"
  description = "Grafana service URL (internal)"
}

output "prometheus_url" {
  value       = "http://prom-stack-prometheus.${var.namespace}.svc.cluster.local:9090"
  description = "Prometheus service URL (internal)"
}

Tú dijiste:
Ejecuta el siguiente prompt N del archivo "/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N251. En cada ejecución incrementa N en +1 hasta N420, sin repetir. Como IA programadora, entrega exactamente lo indicado por el prompt con máxima precisión, empezando tu respuesta con la ruta completa del archivo de salida y, a continuación, el programa/artefacto en el lenguaje o formato especificado, coherente con todo el proyecto GNEW (monorepo Node/TS, Solidity, Terraform, CI/CD, seguridad). Mantén consistencia con estándares y DoD del documento y conserva un puntero interno de progreso para continuar en N+1 en la siguiente ejecución.
ChatGPT Plus
Pensó durante 1m 17s

