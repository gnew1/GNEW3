
import { expect } from "chai";
import { GasOptimizer } from "../../services/finops/gasOptimizer";
import { ethers } from "ethers";

describe("M18 GasOptimizer", () => {
  const optimizer = new GasOptimizer("http://localhost:8545");

  it("estima gas para transacción simple", async () => {
    const tx = { to: ethers.ZeroAddress, value: ethers.parseEther("0.01") };
    const estimation = await optimizer.estimateGas(tx, "transfer");
    expect(estimation.function).to.equal("transfer");
    expect(estimation.estimatedGas).to.be.a("number");
  }).timeout(10000);
});


