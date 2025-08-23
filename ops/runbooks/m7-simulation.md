
# Runbook M7 - Simulación Económica y Tokenomics

## Objetivos
- Validar dinámica de tokens GNEW y GNEW0 bajo distintos escenarios.
- Simular impacto de nuevos contribuyentes y crecimiento de supply.

## DoD
1. Ejecutar `python services/simulation/m7-tokenomics-simulation.py`.
2. Verificar que `supply_gnew` crece en el tiempo.
3. Confirmar aumento de `contributors` en cada tick.
4. Asegurar que pruebas unitarias pasan (`pytest`).

## Ejemplo
```bash
python services/simulation/m7-tokenomics-simulation.py


Salida esperada:

   supply_gnew  contributors
0   1010000.0           105
...


/README-M7.md
```markdown
# M7: Simulación Económica y Tokenomics

## Entregables
- Modelo cadCAD (`/services/simulation/m7-tokenomics-simulation.py`).
- Tests unitarios (`/tests/simulation/test_m7_tokenomics.py`).
- CI para validar simulación (`/ops/ci/m7-simulation.yml`).
- Runbook (`/ops/runbooks/m7-simulation.md`).

## Commit sugerido


feat(simulation): agregar módulo M7 con modelo cadCAD de tokenomics y CI


## Riesgos
- cadCAD requiere instalación adicional → mitigado con configuración en CI.
- Modelo inicial simplificado, requiere calibración con datos reales.


M_pointer actualizado: M8 ✅

