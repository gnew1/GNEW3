import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
describe("StrategyVault DCA", () => { 
  it("ejecuta DCA con cofres, slippage y pausa de mercado", async () 
=> { 
    const [owner, keeper, dao, depositor] = await ethers.getSigners(); 
 
    const Feed = await ethers.getContractFactory("MockFeed"); 
    // Feeds en USD con 8 dec 
    const feedIn = await Feed.deploy(ethers.parseUnits("1.00", 8));   
// tokenIn = 1 USD 
    const feedOut = await Feed.deploy(ethers.parseUnits("1.00", 8));  
// tokenOut = 1 USD 
 
    const Vault = await ethers.getContractFactory("StrategyVault"); 
    const vault = await Vault.deploy(dao.address); 
 
    await vault.connect(owner).setKeeper(keeper.address, true); 
 
    const Router = await ethers.getContractFactory("MockRouter"); 
    const router = await Router.deploy(); 
    await vault.connect(owner).setRouter(await router.getAddress(), 
true); 
 
    const T = await ethers.getContractFactory("MockERC20"); 
    const tokenIn = await T.deploy("USDC-m","USDCm"); 
    const tokenOut = await T.deploy("DAI-m","DAIm"); 
 
    // Estrategia: 100e18 cada 1h, slippage 1%, minOut 99%, move 
threshold 5% 
    const now = (await ethers.provider.getBlock("latest"))!.timestamp; 
    const oracles = { 
      feedIn: await feedIn.getAddress(), 
      feedOut: await feedOut.getAddress(), 
      maxMoveBps: 500 
    }; 
    const tx = await vault.createStrategy( 
      await tokenIn.getAddress(), 
      await tokenOut.getAddress(), 
      await router.getAddress(), 
      ethers.parseEther("100"), 
      3600, 
      100,  // 1% 
      9900, // 99% of oracle 
      now, 
      0, 
      oracles 
    ); 
    const rc = await tx.wait(); 
    const id = (await vault.strategiesCount()) - 1n; 
 
    // Cofre: depositar 1000 tokenIn 
    await tokenIn.mint(depositor.address, ethers.parseEther("1000")); 
    await tokenIn.connect(depositor).approve(await vault.getAddress(), 
ethers.parseEther("1000")); 
    await vault.connect(depositor).depositToChest(id, 
ethers.parseEther("1000")); 
 
    // Avanza a la primera ejecución 
    await ethers.provider.send("evm_increaseTime", [3700]); 
    await ethers.provider.send("evm_mine", []); 
 
    // Ejecuta keeper 
    await expect(vault.connect(keeper).executeDCA(id, 
0)).to.emit(vault, "Executed"); 
 
    // Simula alta volatilidad -> should pause 
    await feedIn.setAnswer(ethers.parseUnits("1.30", 8)); // +30% move 
    await ethers.provider.send("evm_increaseTime", [3700]); 
    await ethers.provider.send("evm_mine", []); 
    await expect(vault.connect(keeper).executeDCA(id, 
0)).to.be.revertedWith("market paused by oracle"); 
    const s = await vault.getStrategy(id); 
    expect(s.status).to.eq(1); // Paused 
 
    // DAO kill-switch global 
    await vault.connect(dao)["killAll"](); 
    await expect(vault.connect(keeper).executeDCA(id, 
0)).to.be.revertedWithCustomError; 
  }); 
}); 
 
 
