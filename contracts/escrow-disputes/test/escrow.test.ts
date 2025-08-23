
import { expect } from "chai";
import { ethers } from "hardhat";

const nowPlus = (s: number) => Math.floor(Date.now() / 1000) + s;

describe("Escrow N325", () => {
  it("funds with ERC20, releases to seller, fees applied", async () => {
    const [owner, treasury, buyer, seller] = await ethers.getSigners();

    const T = await ethers.getContractFactory("TestToken");
    const token = await T.deploy();
    await token.waitForDeployment();

    const Escrow = await ethers.getContractFactory("Escrow");
    const esc = await Escrow.deploy(await treasury.getAddress(), await owner.getAddress());
    await esc.waitForDeployment();

    // mint & approve
    await (await token.mint(await buyer.getAddress(), ethers.parseUnits("1000", 18))).wait();
    await (await token.connect(buyer).approve(await esc.getAddress(), ethers.MaxUint256)).wait();

    // create deal (fee 2%)
    const amount = ethers.parseUnits("100", 18);
    const tx = await esc.createDeal(await buyer.getAddress(), await seller.getAddress(), await token.getAddress(), amount, 200, 600, 3600);
    const rc = await tx.wait();
    const id = Number((await esc.nextId()) - 1n);

    // fund
    await (await esc.connect(buyer).fundToken(id)).wait();

    // buyer releases
    const balSellerBefore = await token.balanceOf(await seller.getAddress());
    const balTreasuryBefore = await token.balanceOf(await treasury.getAddress());
    await (await esc.connect(buyer).releaseToSeller(id)).wait();
    const balSellerAfter = await token.balanceOf(await seller.getAddress());
    const balTreasuryAfter = await token.balanceOf(await treasury.getAddress());

    const fee = amount * 200n / 10_000n;
    expect(balSellerAfter - balSellerBefore).to.equal(amount - fee);
    expect(balTreasuryAfter - balTreasuryBefore).to.equal(fee);
  });

  it("dispute + bilateral EIP-712 settlement splits amounts", async () => {
    const [owner, treasury, buyer, seller] = await ethers.getSigners();
    const T = await ethers.getContractFactory("TestToken");
    const token = await T.deploy();
    const Escrow = await ethers.getContractFactory("Escrow");
    const esc = await Escrow.deploy(await treasury.getAddress(), await owner.getAddress());

    // funds
    await (await token.mint(await buyer.getAddress(), ethers.parseUnits("1000", 18))).wait();
    await (await token.connect(buyer).approve(await esc.getAddress(), ethers.MaxUint256)).wait();

    const amount = ethers.parseUnits("100", 18);
    await (await esc.createDeal(await buyer.getAddress(), await seller.getAddress(), await token.getAddress(), amount, 100, 60, 3600)).wait();
    const id = Number((await esc.nextId()) - 1n);
    await (await esc.connect(buyer).fundToken(id)).wait();

    // open dispute with evidence
    await (await esc.connect(buyer).openDispute(id, "ipfs://Qm...", ethers.keccak256(ethers.toUtf8Bytes("doc1")) as `0x${string}`)).wait();

    // prepare EIP712 settlement
    const domain = {
      name: "GNEW-Escrow",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await esc.getAddress()
    } as const;

    const types = {
      Settlement: [
        { name: "dealId", type: "uint256" },
        { name: "buyerAmount", type: "uint256" },
        { name: "sellerAmount", type: "uint256" },
        { name: "deadline", type: "uint64" }
      ]
    } as const;

    const buyerAmount = ethers.parseUnits("30", 18);
    const sellerAmount = amount - buyerAmount;
    const value = { dealId: id, buyerAmount, sellerAmount, deadline: nowPlus(3600) };

    const sigB = await buyer.signTypedData(domain, types, value);
    const sigS = await seller.signTypedData(domain, types, value);

    const balB0 = await token.balanceOf(await buyer.getAddress());
    const balS0 = await token.balanceOf(await seller.getAddress());

    await (await esc.settleByAgreement(id, buyerAmount, sellerAmount, value.deadline, sigB, sigS)).wait();

    const fee = sellerAmount * 100n / 10_000n;
    const balB1 = await token.balanceOf(await buyer.getAddress());
    const balS1 = await token.balanceOf(await seller.getAddress());

    expect(balB1 - balB0).to.equal(buyerAmount);
    expect(balS1 - balS0).to.equal(sellerAmount - fee);
  });

  it("timeouts: auto release after respondBy if no dispute; refund to buyer if no arbitration by arbitrateBy", async () => {
    const [owner, treasury, buyer, seller, arb] = await ethers.getSigners();
    const T = await ethers.getContractFactory("TestToken");
    const token = await T.deploy();
    const Escrow = await ethers.getContractFactory("Escrow");
    const esc = await Escrow.deploy(await treasury.getAddress(), await owner.getAddress());

    await (await token.mint(await buyer.getAddress(), ethers.parseUnits("1000", 18))).wait();
    await (await token.connect(buyer).approve(await esc.getAddress(), ethers.MaxUint256)).wait();

    // 1) auto release path
    const amount = ethers.parseUnits("10", 18);
    await (await esc.createDeal(await buyer.getAddress(), await seller.getAddress(), await token.getAddress(), amount, 0, 10, 60)).wait();
    let id = Number((await esc.nextId()) - 1n);
    await (await esc.connect(buyer).fundToken(id)).wait();
    await ethers.provider.send("evm_increaseTime", [11]); await ethers.provider.send("evm_mine", []);
    await (await esc.autoReleaseIfTimeout(id)).wait();
    // 2) dispute no arbitration -> refund
    await (await esc.createDeal(await buyer.getAddress(), await seller.getAddress(), await token.getAddress(), amount, 0, 10, 10)).wait();
    id = Number((await esc.nextId()) - 1n);
    await (await esc.connect(buyer).fundToken(id)).wait();
    await (await esc.connect(buyer).openDispute(id, "ipfs://hash", ethers.keccak256(ethers.toUtf8Bytes("doc")) as `0x${string}`)).wait();
    await ethers.provider.send("evm_increaseTime", [11]); await ethers.provider.send("evm_mine", []);
    await (await esc.refundIfNoArbitration(id)).wait();
  });
});


