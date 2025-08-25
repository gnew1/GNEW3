# N267 • Weekly Missions CI

Este documento contiene el contexto y las notas originalmente embebidas en el workflow YAML retiradas para mantener una sintaxis válida.

## Descripción

Pipeline de CI/CD para validar la generación de misiones semanales.

- Ejecuta el proceso de build del monorepo semanalmente vía `schedule`.
- Puede ejecutarse manualmente con `workflow_dispatch`.
- Publica un artefacto `status` que indica `archived` para trazabilidad de ejecuciones.

## Historia/Notas

- Referencia a módulos relacionados: feedback → misiones (N266).
- Versiones: Node LTS y pnpm 9.

## Artefactos

- `status`: archivo de texto simple con el contenido `archived` que se carga en cada ejecución (siempre) para confirmación rápida del estado.
