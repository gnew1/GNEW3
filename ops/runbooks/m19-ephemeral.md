
# Runbook M19 - Entornos efímeros por PR

## Objetivo
- Crear entornos aislados por PR automáticamente.
- Usar Helm en un cluster k3s/k8s.
- Exponer URL pública única por PR.

## Flujo
1. PR dispara workflow en GitHub Actions.
2. Docker construye y publica imagen etiquetada con número de PR.
3. Helm despliega entorno efímero con `pr-<numero>.gnew.dev`.
4. Bot comenta en el PR con la URL.
5. Al cerrar PR, entorno se limpia.

## DoD
- Entorno visible en <https://pr-N.gnew.dev>.
- Limpieza automática al cerrar PR.
- Helm chart reproducible con `helm upgrade --install`.

## Riesgos
- **Colisiones de nombres de PR** → mitigación: usar prefijo `pr-`.
- **Costes de cluster** → mitigación: limpieza inmediata.


