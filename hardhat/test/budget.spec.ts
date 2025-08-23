import { expect } from "chai"; 
import { ethers } from "hardhat"; 
 
const CAT_OPS = ethers.id("ops");      // bytes32 
const CAT_RND = ethers.id("rnd"); 
const Q = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 }; 
 
describe("DAO Budgets (Registry + Vault)", () => { 
  it("crea presupuesto, aprueba, libera tranche y ejecuta gasto dentro 
de allowance", async () => { 
    const [gov, safe, spender, vendor] = await ethers.getSigners(); 
 
    // Token estable de prueba 
    const T = await ethers.getContractFactory(` 
      contract T { 
        string public name="USDm"; string public symbol="USDm"; uint8 
public decimals=18; 
        uint256 public totalSupply; mapping(address=>uint256) public 
balanceOf; mapping(address=>mapping(address=>uint256)) public 
allowance; 
        event Transfer(address indexed a,address indexed b,uint v); 
event Approval(address indexed a,address indexed b,uint v); 
        function mint(address to,uint v) external { balanceOf[to]+=v; 
totalSupply+=v; emit Transfer(address(0),to,v); } 
        function approve(address s,uint v) external returns(bool){ 
allowance[msg.sender][s]=v; emit Approval(msg.sender,s,v); return 
true; } 
        function transfer(address to,uint v) external returns(bool){ 
require(balanceOf[msg.sender]>=v); balanceOf[msg.sender]-=v; 
balanceOf[to]+=v; emit Transfer(msg.sender,to,v); return true; } 
        function transferFrom(address f,address to,uint v) external 
returns(bool){ uint a=allowance[f][msg.sender]; require(a>=v && 
balanceOf[f]>=v); allowance[f][msg.sender]=a-v; balanceOf[f]-=v; 
balanceOf[to]+=v; emit Transfer(f,to,v); return true; } 
      }`); 
    const token = await T.deploy(); 
 
    const Registry = await 
ethers.getContractFactory("BudgetRegistry"); 
    const registry = await Registry.deploy(gov.address); 
 
    const Vault = await ethers.getContractFactory("BudgetVault"); 
    const vault = await Vault.deploy(await registry.getAddress(), 
gov.address); 
 
    // Governor crea presupuesto FY2025 
    const cats = [CAT_OPS, CAT_RND]; 
    await registry.connect(gov).createBudget( 
      2025, 
      await token.getAddress(), 
      safe.address, // controller (Safe) 
      "ipfs://CID", 
      cats, 
      ["Ops", "R&D"] 
    ); 
    const id = 0; 
 
    // Plan Q1 
    await registry.connect(gov).setPlan(id, Q.Q1, CAT_OPS, 
ethers.parseEther("10000")); 
    await registry.connect(gov).setPlan(id, Q.Q1, CAT_RND, 
ethers.parseEther("5000")); 
    await registry.connect(gov).approve(id); 
    await registry.connect(gov).activate(id); 
 
    // Fondos al vault desde tesorería (simulado) 
    await token.mint(await vault.getAddress(), 
ethers.parseEther("50000")); 
 
    // Delegar spender adicional (además del Safe/controller) 
    await vault.connect(gov).setSpender(id, spender.address, true); 
 
    // Liberar tranche para Q1: Ops=4k, RnD=2k 
    await vault.connect(gov).releaseTranche( 
      id, 
      Q.Q1, 
      [CAT_OPS, CAT_RND], 
      [ethers.parseEther("4000"), ethers.parseEther("2000")] 
    ); 
 
    // spend: spender ejecuta 1500 USDm a vendor vía categoría Ops 
    await vault.connect(spender).spendERC20( 
      id, Q.Q1, CAT_OPS, await token.getAddress(), vendor.address, 
ethers.parseEther("1500") 
    ); 
 
    // KPI básicos: actual Q1 Ops debe reflejar 1500; allowance 
restante 2500 
    const actualOps = await registry.getActual(id, Q.Q1, CAT_OPS); 
    expect(actualOps).to.eq(ethers.parseEther("1500")); 
    const remaining = await vault.allowances(id, Q.Q1, CAT_OPS); 
    expect(remaining).to.eq(ethers.parseEther("2500")); 
 
    // Reforecast: incrementar R&D a 6k por cambio de plan 
    await registry.connect(gov).reforecast(id, Q.Q1, CAT_RND, 
ethers.parseEther("6000"), "contrataciones"); 
    const planRnd = await registry.getPlan(id, Q.Q1, CAT_RND); 
    expect(planRnd).to.eq(ethers.parseEther("6000")); 
  }); 
 
  it("kill-switch pausando gastos", async () => { 
    const [gov, safe, vendor] = await ethers.getSigners(); 
    const T = await ethers.getContractFactory(` 
      contract T { uint8 public decimals=18; mapping(address=>uint) 
public balanceOf; mapping(address=>mapping(address=>uint)) public 
allowance; 
        function mint(address a,uint v) external { balanceOf[a]+=v; } 
        function transfer(address to,uint v) external returns(bool){ 
require(balanceOf[msg.sender]>=v); balanceOf[msg.sender]-=v; 
balanceOf[to]+=v; return true; } 
      }`); 
    const token = await T.deploy(); 
    const Registry = await 
ethers.getContractFactory("BudgetRegistry"); 
    const registry = await Registry.deploy(gov.address); 
    const Vault = await ethers.getContractFactory("BudgetVault"); 
    const vault = await Vault.deploy(await registry.getAddress(), 
gov.address); 
 
    await registry.connect(gov).createBudget(2025, await 
token.getAddress(), safe.address, "-", [ethers.id("ops")], ["ops"]); 
    await registry.connect(gov).approve(0); await 
registry.connect(gov).activate(0); 
    await token.mint(await vault.getAddress(), 
ethers.parseEther("10000")); 
    await vault.connect(gov).releaseTranche(0, 0, [ethers.id("ops")], 
[ethers.parseEther("1000")]); 
 
    // pause 
    await vault.connect(gov).pauseAll(); 
    await expect( 
      vault.connect(safe).spendERC20(0, 0, ethers.id("ops"), await 
token.getAddress(), vendor.address, ethers.parseEther("10")) 
    ).to.be.revertedWithCustomError; 
  }); 
}); 
 
 
