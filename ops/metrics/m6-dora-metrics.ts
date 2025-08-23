
/**
 * M6: Gestión Activa de Deuda Técnica
 * Métricas DORA integradas para GNEW
 */

import { execSync } from "child_process";

export interface DoraMetrics {
  deploymentFrequency: number; // despliegues/día
  leadTimeForChanges: number; // en horas
  changeFailureRate: number; // %
  meanTimeToRecovery: number; // en minutos
}

export function getDeploymentFrequency(): number {
  const output = execSync(
    "git log --since='7 days ago' --pretty=format:'%h' | wc -l"
  ).toString();
  return parseInt(output.trim()) / 7;
}

export function getLeadTimeForChanges(): number {
  // stub: usaría PR timestamps de GitHub API
  return 12; // horas
}

export function getChangeFailureRate(): number {
  // stub: usaría incidents de Sentry/alerts de Prometheus
  return 0.05; // 5%
}

export function getMeanTimeToRecovery(): number {
  // stub: usaría incident reports en /ops/runbooks
  return 15; // minutos
}

export function collectMetrics(): DoraMetrics {
  return {
    deploymentFrequency: getDeploymentFrequency(),
    leadTimeForChanges: getLeadTimeForChanges(),
    changeFailureRate: getChangeFailureRate(),
    meanTimeToRecovery: getMeanTimeToRecovery(),
  };
}


