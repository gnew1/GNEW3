import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("GnewSoulboundBadges", () => { 
  it("no permite transferencias ni approvals", async () => { 
    const [admin, user, other] = await ethers.getSigners(); 
    const SBT = await 
ethers.getContractFactory("GnewSoulboundBadges"); 
    const sbt = await SBT.deploy(admin.address, "GNEW SBT", "GSBT", 
"ipfs://badges/"); 
    await sbt.waitForDeployment(); 
 
    await (await sbt.connect(admin).createBadgeType({ 
      name: "Contributor", description: "Core contributor", 
      image: "ipfs://icon", points: 10, rarity: 1, revocableByOwner: 
true, active: true 
    })).wait(); 
 
    const tx = await sbt.connect(admin).mint(await user.getAddress(), 
1, "ipfs://cid1", "did:gnew:issuer", ethers.ZeroHash); 
    const rc = await tx.wait(); 
    const tokenId = (rc!.logs[1] as any).args.tokenId ?? 1; 
 
    await expect(sbt.connect(user).transferFrom(await 
user.getAddress(), await other.getAddress(), tokenId)) 
      .to.be.revertedWith("SBT:NON_TRANSFERABLE"); 
    await expect(sbt.connect(user).approve(await other.getAddress(), 
tokenId)) 
      .to.be.revertedWith("SBT:NON_TRANSFERABLE"); 
 
    expect(await sbt["tokenURI"](tokenId)).to.eq("ipfs://cid1"); 
    expect(await sbt.callStatic["locked"](tokenId)).to.eq(true); 
  }); 
 
  it("burn por holder si el tipo lo permite", async () => { 
    const [admin, user] = await ethers.getSigners(); 
    const SBT = await 
ethers.getContractFactory("GnewSoulboundBadges"); 
    const sbt = await SBT.deploy(admin.address, "GNEW SBT", "GSBT", 
"ipfs://badges/"); 
    await sbt.waitForDeployment(); 
    await (await sbt.connect(admin).createBadgeType({ 
      name: "Privacy", description: "Revocable by owner", 
      image: "ipfs://icon", points: 1, rarity: 0, revocableByOwner: 
true, active: true 
    })).wait(); 
 
    const tokenId = await (await sbt.connect(admin).mint(await 
user.getAddress(), 1, "ipfs://cid", "did:gnew:issuer", 
ethers.ZeroHash)).then(r => r.wait()).then(r => (r!.logs[1] as 
any).args.tokenId ?? 1); 
await expect(sbt.connect(user).burn(tokenId)).to.emit(sbt, 
"BadgeBurned"); 
}); 
}); 
