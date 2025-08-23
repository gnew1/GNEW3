
import { expect } from "chai";
import { ethers } from "hardhat";
import { FairOrdering } from "../../typechain-types";

describe("M14 FairOrdering", () => {
  let contract: FairOrdering;
  let user: any, receiver: any;

  beforeEach(async () => {
    [user, receiver] = await ethers.getSigners();
    const FairOrderingFactory = await ethers.getContractFactory("FairOrdering");
    contract = (await FairOrderingFactory.deploy()) as FairOrdering;
    await user.sendTransaction({ to: contract.getAddress(), value: ethers.parseEther("1") });
  });

  it("debería permitir commit y reveal", async () => {
    const txData = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [receiver.address, ethers.parseEther("0.1")]);
    const salt = ethers.randomBytes(32);
    const commitHash = ethers.keccak256(ethers.solidityPacked(["bytes", "bytes32"], [txData, salt]));

    await contract.connect(user).commit(commitHash);
    const c = await contract.commitments(user.address);
    expect(c.commitHash).to.equal(commitHash);

    await contract.connect(user).reveal(txData, salt);
    expect(await ethers.provider.getBalance(receiver.address)).to.be.greaterThan(0n);
  });
});


