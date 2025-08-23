
import { expect } from "chai";
import { ethers } from "hardhat";
import { DynamicPaymaster } from "../../typechain-types";

describe("M13 DynamicPaymaster", () => {
  let paymaster: DynamicPaymaster;
  let dao: any, user: any;

  beforeEach(async () => {
    [dao, user] = await ethers.getSigners();
    const EntryPointMock = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPointMock.deploy();

    const Paymaster = await ethers.getContractFactory("DynamicPaymaster");
    paymaster = (await Paymaster.deploy(entryPoint.getAddress(), dao.address)) as DynamicPaymaster;
  });

  it("debería permitir que DAO actualice la política de gas", async () => {
    await paymaster.connect(dao).updatePolicy(2n * 10n ** 9n);
    expect(await paymaster.maxGasFee()).to.equal(2n * 10n ** 9n);
  });

  it("debería agregar a la allowlist", async () => {
    await paymaster.connect(dao).setAllowlist(user.address, true);
    expect(await paymaster.allowlist(user.address)).to.equal(true);
  });
});


