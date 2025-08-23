
#!/usr/bin/env bash
set -euo pipefail

# Verificación de integridad de dependencias con Sigstore Cosign
# Requiere instalación previa de cosign

TARGET=$1

echo "[M12] Verificando integridad del binario: $TARGET"
cosign verify-blob --key cosign.pub --signature "${TARGET}.sig" "$TARGET"


