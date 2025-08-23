import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import { GnewGovToken } from "../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("GnewGovToken (HH)", () => { 
  let gov: GnewGovToken; 
  let owner: any, alice: any, bob: any; 
 
  beforeEach(async () => { 
    [owner, alice, bob] = await ethers.getSigners(); 
    const F = await ethers.getContractFactory("GnewGovToken"); 
    gov = (await F.deploy( 
      "GNEW-GOV", 
      "gGNEW", 
      owner.address, 
      toWei("100"), 
      toWei("1000"), 
      toWei("5"), 
      3600 
    )) as GnewGovToken; 
    await gov.waitForDeployment(); 
  }); 
 
  it("cap inicial y supply", async () => { 
    expect(await gov.totalSupply()).to.eq(toWei("100")); 
    expect(await gov.MAX_SUPPLY()).to.eq(toWei("1000")); 
  }); 
 
  it("mint respeta cap y requiere rol", async () => { 
    await expect(gov.connect(alice).mint(alice.address, 
1)).to.be.revertedWithCustomError( 
      gov, 
      "AccessControlUnauthorizedAccount" 
    ); 
    await gov.mint(alice.address, toWei("900")); 
    expect(await gov.totalSupply()).to.eq(toWei("1000")); 
    await expect(gov.mint(bob.address, 1)).to.be.revertedWith("cap 
exceeded"); 
  }); 
 
  it("pause/unpause bloquea transferencias y burns", async () => { 
    await gov.pause(); 
    await expect(gov.transfer(alice.address, 
1)).to.be.revertedWith("paused"); 
    await expect(gov.burn(1)).to.be.revertedWith("paused"); 
    await gov.unpause(); 
    await gov.transfer(alice.address, 1); 
  }); 
 
  it("faucet sólo testnets y respeta cooldown", async () => { 
    // chainid 31337 => testnet local 
    await gov.connect(alice).faucet(); 
    expect(await gov.balanceOf(alice.address)).to.eq(toWei("5")); 
    await 
expect(gov.connect(alice).faucet()).to.be.revertedWith("faucet:cooldow
 n"); 
  }); 
}); 
 
