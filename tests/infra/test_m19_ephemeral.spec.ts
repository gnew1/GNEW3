
import { expect } from "chai";
import { execSync } from "child_process";

describe("M19 Entornos efímeros", () => {
  it("Helm chart renderiza correctamente", () => {
    const output = execSync("helm template ./ops/helm/ephemeral").toString();
    expect(output).to.include("kind: Deployment");
    expect(output).to.include("kind: Service");
  });
});


