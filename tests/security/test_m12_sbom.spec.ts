
import { expect } from "chai";
import { readFileSync } from "fs";

describe("M12 SBOM", () => {
  it("debería generar un archivo SBOM válido en formato CycloneDX", () => {
    const sbom = JSON.parse(readFileSync("sbom.json", "utf-8"));
    expect(sbom.bomFormat).to.equal("CycloneDX");
    expect(sbom.components).to.be.an("array");
  });
});


