import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import { GnewToken } from "../typechain-types"; 
 
const toWei = (n: string) => ethers.parseUnits(n, 18); 
 
describe("GnewToken (Hardhat)", function () { 
  let token: GnewToken; 
  let owner: any, alice: any, bob: any; 
 
  beforeEach(async () => { 
    [owner, alice, bob] = await ethers.getSigners(); 
    const f = await ethers.getContractFactory("GnewToken"); 
    token = (await f.deploy("GNEW", "GNEW", owner.address, 
toWei("1000"))) as GnewToken; 
    await token.waitForDeployment(); 
  }); 
 
  it("tiene nombre/símbolo correctos y suministro inicial", async () 
=> { 
    expect(await token.name()).to.eq("GNEW"); 
    expect(await token.symbol()).to.eq("GNEW"); 
    expect(await token.balanceOf(owner.address)).to.eq(toWei("1000")); 
  }); 
 
  it("roles asignados al owner", async () => { 
    const MINTER_ROLE = await token.MINTER_ROLE(); 
    const PAUSER_ROLE = await token.PAUSER_ROLE(); 
    expect(await token.hasRole(MINTER_ROLE, 
owner.address)).to.eq(true); 
    expect(await token.hasRole(PAUSER_ROLE, 
owner.address)).to.eq(true); 
  }); 
 
  it("no permite mintear sin rol", async () => { 
    await expect(token.connect(alice).mint(alice.address, 
1)).to.be.revertedWithCustomError( 
      token, 
      "AccessControlUnauthorizedAccount" 
    ); 
  }); 
 
  it("minteo con rol y quema voluntaria", async () => { 
    await token.mint(alice.address, toWei("5")); 
    expect(await token.balanceOf(alice.address)).to.eq(toWei("5")); 
    await token.connect(alice).burn(toWei("2")); 
    expect(await token.balanceOf(alice.address)).to.eq(toWei("3")); 
  }); 
 
  it("pausa bloquea transferencias", async () => { 
    await token.mint(alice.address, toWei("1")); 
    await token.pause(); 
    await expect(token.connect(alice).transfer(bob.address, 
1)).to.be.revertedWith("paused"); 
    await token.unpause(); 
    await token.connect(alice).transfer(bob.address, 1); 
    expect(await token.balanceOf(bob.address)).to.eq(1n); 
  }); 
}); 
 
