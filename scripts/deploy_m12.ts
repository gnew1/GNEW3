
import { execSync } from "child_process";

async function main() {
  console.log("[M12] Generando SBOM...");
  execSync("npx @cyclonedx/cyclonedx-npm --output-file sbom.json", { stdio: "inherit" });

  console.log("[M12] Firmando artefacto con cosign...");
  execSync("cosign sign-blob --key cosign.key sbom.json --output-signature sbom.json.sig", { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


