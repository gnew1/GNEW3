import { expect } from "chai"; 
import { ethers } from "hardhat"; 
import type { Delegation } from "../../typechain-types"; 
 
describe("Delegation — revocable + expiración + reasignación", () => { 
  let D: Delegation; 
  let a: any, b: any, c: any; 
 
  const SCOPE_TOKEN = ethers.id("TOKEN_VOTES"); 
  const SCOPE_REP   = ethers.id("REPUTATION_VOTES"); 
 
  beforeEach(async () => { 
    [a, b, c] = await ethers.getSigners(); 
    const F = await ethers.getContractFactory("Delegation"); 
    D = (await F.deploy()) as Delegation; 
    await D.waitForDeployment(); 
  }); 
 
  it("nueva delegación y expiración: vuelve al delegador sin pérdida", 
async () => { 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    await expect(D.connect(a).delegate(SCOPE_TOKEN, b.address, now + 
3600)) 
      .to.emit(D, "Delegated"); 
 
    let [eff, active] = await D.effectiveDelegateOf(a.address, 
SCOPE_TOKEN); 
    expect(eff).to.eq(b.address); 
    expect(active).to.eq(true); 
 
    // avanza más allá de la expiración 
    await ethers.provider.send("evm_increaseTime", [3700]); 
    await ethers.provider.send("evm_mine", []); 
    [eff, active] = await D.effectiveDelegateOf(a.address, 
SCOPE_TOKEN); 
    expect(eff).to.eq(a.address); // vuelve al propio delegador 
    expect(active).to.eq(false); 
  }); 
 
  it("reasignación cambia el delegado manteniendo expiración", async 
() => { 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    await D.connect(a).delegate(SCOPE_TOKEN, b.address, now + 7200); 
 
    // Reasignar a C con nueva expiración 
    await expect(D.connect(a).delegate(SCOPE_TOKEN, c.address, now + 
10800)) 
      .to.emit(D, "Reassigned"); 
 
    const rec = await D.getDelegation(a.address, SCOPE_TOKEN); 
    expect(rec.delegatee).to.eq(c.address); 
    expect(rec.expiresAt).to.eq(now + 10800); 
  }); 
 
  it("extend reduce/aumenta expiración, mismo delegado", async () => { 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    await D.connect(a).delegate(SCOPE_TOKEN, b.address, now + 3600); 
 
    await expect(D.connect(a).extend(SCOPE_TOKEN, now + 5400)) 
      .to.emit(D, "Extended"); 
 
    const rec1 = await D.getDelegation(a.address, SCOPE_TOKEN); 
    expect(rec1.expiresAt).to.eq(now + 5400); 
 
    await expect(D.connect(a).extend(SCOPE_TOKEN, 0)) // sin 
expiración 
      .to.emit(D, "Extended"); 
 
    const rec2 = await D.getDelegation(a.address, SCOPE_TOKEN); 
    expect(rec2.expiresAt).to.eq(0); 
  }); 
 
  it("revocar limpia la entrada", async () => { 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    await D.connect(a).delegate(SCOPE_TOKEN, b.address, now + 3600); 
    await expect(D.connect(a).revoke(SCOPE_TOKEN)).to.emit(D, 
"Revoked"); 
    const rec = await D.getDelegation(a.address, SCOPE_TOKEN); 
    expect(rec.delegatee).to.eq(ethers.ZeroAddress); 
  }); 
 
  it("scopes independientes (sin colisión)", async () => { 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    await D.connect(a).delegate(SCOPE_TOKEN, b.address, now + 3600); 
    await D.connect(a).delegate(SCOPE_REP,   c.address, now + 3600); 
 
    const recT = await D.getDelegation(a.address, SCOPE_TOKEN); 
    const recR = await D.getDelegation(a.address, SCOPE_REP); 
    expect(recT.delegatee).to.eq(b.address); 
    expect(recR.delegatee).to.eq(c.address); 
  }); 
}); 
 
