
# Runbook M12 - Seguridad de Cadena de Suministro

## Objetivo
Proveer trazabilidad y verificación de dependencias de GNEW mediante SBOM, SLSA, in-toto y firmas Sigstore.

## Pasos
1. Generar SBOM con CycloneDX (`npm run sbom`).
2. Firmar artefactos con `cosign sign-blob`.
3. Verificar con `ops/security/m12-verify.sh <binario>`.
4. Validar layout de in-toto para garantizar la cadena de construcción.

## DoD
- SBOM actualizado en cada push.
- Artefactos firmados con Sigstore.
- Validación automática en CI.
- Test unitario para formato SBOM.


