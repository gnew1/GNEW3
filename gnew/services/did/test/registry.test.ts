/** 
 * Tests de contrato usando Hardhat (pseudo) 
 * - deploy registry 
 * - register/update/revoke flujos 
 */ 
import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("GnewDIDRegistry", () => { 
  it("register/update/revoke", async () => { 
    const [admin, registrar, controller] = await ethers.getSigners(); 
    const Registry = await 
ethers.getContractFactory("GnewDIDRegistry"); 
    const reg = await Registry.connect(admin).deploy(admin.address, 
registrar.address); 
    await reg.waitForDeployment(); 
 
    const did = "did:gnew:eip155:1337:" + 
controller.address.toLowerCase(); 
    const docURI = "ipfs://CID"; 
    const hash = "0x" + "11".repeat(32); 
 
    // controller self-register 
    await expect(reg.connect(controller).registerByController(did, 
docURI, hash)).to.emit(reg, "DIDRegistered"); 
 
    // update 
    const docURI2 = "ipfs://CID2"; 
    const hash2 = "0x" + "22".repeat(32); 
    await expect(reg.connect(controller).updateDocument(did, docURI2, 
hash2)).to.emit(reg, "DIDUpdated"); 
 
    // revoke 
    await expect(reg.connect(controller).revoke(did)).to.emit(reg, 
"DIDRevoked"); 
 
    const rec = await reg.getRecord(did); 
    expect(rec.revoked).to.eq(true); 
  }); 
}); 
 
 
