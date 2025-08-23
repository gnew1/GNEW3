
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  async function deploy() {
    const [merchant, user] = await ethers.getSigners();
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Mock USD", "mUSD", 6);
    await token.waitForDeployment();

    const SM = await ethers.getContractFactory("SubscriptionManager");
    const sm = await SM.deploy();
    await sm.waitForDeployment();

    return { merchant, user, token, sm };
  }

  beforeEach(async function () {
    // minimal ERC20 for tests
    const code = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.24;
    contract ERC20Mock {
      string public name; string public symbol; uint8 public decimals;
      uint256 public totalSupply;
      mapping(address => uint256) public balanceOf;
      mapping(address => mapping(address=>uint256)) public allowance;
      constructor(string memory n,string memory s,uint8 d){name=n;symbol=s;decimals=d;}
      function mint(address to,uint256 a) external {balanceOf[to]+=a; totalSupply+=a;}
      function approve(address s,uint256 a) external returns(bool){allowance[msg.sender][s]=a;return true;}
      function transferFrom(address f,address t,uint256 a) external returns(bool){
        require(allowance[f][msg.sender]>=a,"allow"); require(balanceOf[f]>=a,"bal");
        allowance[f][msg.sender]-=a; balanceOf[f]-=a; balanceOf[t]+=a; return true;
      }
    }`;
    await ethers.getSigners();
    await ethers.getContractFactory("ERC20Mock", { signer: (await ethers.getSigners())[0], sources: { "ERC20Mock.sol": { content: code } } });
  });

  it("creates plan, subscribes and charges", async function () {
    const { merchant, user, token, sm } = await deploy();
    const amount = 10_000; // 0.01 with 6 decimals
    const period = 7 * 24 * 60 * 60;

    const tx = await sm.connect(merchant).createPlan(await token.getAddress(), amount, period, 0);
    const receipt = await tx.wait();
    const planId = (await sm.plans(0))[0] ? 0 : 0; // index 0

    await token.mint(user.address, 100_000);
    await token.connect(user).approve(await sm.getAddress(), 100_000);

    await sm.connect(user).subscribe(planId, 2 * 24 * 60 * 60, false);
    const sub = await sm.subscriptionOf(planId, user.address);
    expect(sub.status).to.equal(0); // Active

    await sm.connect(merchant).charge(planId, user.address);
    const after = await token.balanceOf(merchant.address);
    expect(after).to.equal(amount);
  });

  it("prorates first charge when anchored", async function () {
    const { merchant, user, token, sm } = await deploy();
    const amount = 30_000;
    const period = 30 * 24 * 60 * 60;
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const firstOfMonth = now - (now % (30 * 24 * 60 * 60)); // fake anchor ~month

    await sm.connect(merchant).createPlan(await token.getAddress(), amount, period, firstOfMonth);
    await token.mint(user.address, 100_000);
    await token.connect(user).approve(await sm.getAddress(), 100_000);

    await sm.connect(user).subscribe(0, 7 * 24 * 60 * 60, true); // prorate
    // first charge executed in subscribe(); balance moved to merchant
    const bal = await token.balanceOf(merchant.address);
    expect(bal).to.be.gt(0);
    expect(bal).to.be.lt(amount);
  });
});


