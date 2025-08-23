
import { expect } from "chai";
import { ethers } from "hardhat";

describe("M11 Dynamic Governance Gates", function () {
  it("permite añadir gates y evaluar elegibilidad", async () => {
    const [owner, user1] = await ethers.getSigners();

    const ReputationGate = await ethers.getContractFactory("ReputationGate");
    const repGate = await ReputationGate.deploy();

    const DynamicGovernance = await ethers.getContractFactory("DynamicGovernance");
    const gov = await DynamicGovernance.deploy();

    await gov.addGate(repGate.target);

    // Al inicio, user1 no es elegible
    expect(await gov.canVote(user1.address)).to.equal(false);

    // Asignamos reputación y vuelve elegible
    await repGate.setReputation(user1.address, 200);
    expect(await gov.canVote(user1.address)).to.equal(true);
  });
});


