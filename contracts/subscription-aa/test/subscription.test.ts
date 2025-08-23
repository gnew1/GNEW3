
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Subscription (N322)", () => {
  it("alta/baja, prorrateo, idempotencia y fallbacks", async () => {
    const [merchant, subscriber, operator] = await ethers.getSigners();

    // Deploy token y contrato
    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy();
    await token.waitForDeployment();

    const Subscription = await ethers.getContractFactory("Subscription");
    const subc = await Subscription.deploy(await merchant.getAddress());
    await subc.waitForDeployment();

    // Merchant configura operator collector
    await (await subc.connect(merchant).setCollector(await merchant.getAddress(), await operator.getAddress(), true)).wait();

    // Plan: 100 unidades / 30d
    const price = ethers.parseUnits("100", 18);
    const period = 30n * 24n * 60n * 60n;
    const txPlan = await subc.connect(merchant).createPlan(token, price, Number(period), 0, "basic");
    const rc = await txPlan.wait();
    const planId = Number(rc!.logs[0]!.args![0]); // PlanCreated(planId,...)

    // Suscriptor: recibe fondos y allowance
    await (await token.mint(await subscriber.getAddress(), ethers.parseUnits("1000", 18))).wait();
    await (await token.connect(subscriber).approve(await subc.getAddress(), ethers.parseUnits("1000", 18))).wait();

    // anchor: 15 días atrás, prorrateo ON -> primer cargo aprox 50%
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const anchor = now - Number(15n * 24n * 60n * 60n);
    const txSub = await subc.connect(subscriber).subscribe(planId, anchor, true);
    const rcSub = await txSub.wait();
    const subId = Number(rcSub!.logs[1]!.args![0]); // Subscribed(subId,...)

    // avanza el tiempo a que esté due
    const nextChargeTs = (await subc.subs(subId)).nextChargeTs;
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(nextChargeTs) + 1]);
    await ethers.provider.send("evm_mine", []);

    // charge desde operator (ERC-4337 AA en backend usaría paymaster)
    await (await subc.connect(operator).chargeDue(subId)).wait();

    const cycleIndex1 = (await subc.subs(subId)).cycleIndex;
    expect(cycleIndex1).to.equal(1);

    // idempotencia: cobrar de nuevo el mismo ciclo no duplica
    await (await subc.connect(operator).chargeDue(subId)).wait();
    const cycleIndex2 = (await subc.subs(subId)).cycleIndex;
    expect(cycleIndex2).to.equal(1);

    // avanza 1 período y cobra ciclo 2 completo
    const plan = await subc.plans(planId);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(nextChargeTs) + Number(plan.period) + 2]);
    await ethers.provider.send("evm_mine", []);
    await (await subc.connect(operator).chargeDue(subId)).wait();
    const cycleIndex3 = (await subc.subs(subId)).cycleIndex;
    expect(cycleIndex3).to.equal(2);

    // cancelar
    await (await subc.connect(subscriber).cancel(subId)).wait();
    const s = await subc.subs(subId);
    expect(s.status).to.equal(2); // Canceled
  });

  it("fallback por falta de allowance/balance genera arrears y no revierte", async () => {
    const [merchant, subscriber, operator] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy();
    await token.waitForDeployment();

    const Subscription = await ethers.getContractFactory("Subscription");
    const subc = await Subscription.deploy(await merchant.getAddress());
    await subc.waitForDeployment();

    await (await subc.setCollector(await merchant.getAddress(), await operator.getAddress(), true)).wait();

    const price = ethers.parseUnits("100", 18);
    const period = 7n * 24n * 60n * 60n;
    const planId = Number((await (await subc.connect(merchant).createPlan(token, price, Number(period), 0, "weekly")).wait())!.logs[0]!.args![0]);

    // fondos insuficientes: 30 tokens, allowance 30
    await (await token.mint(await subscriber.getAddress(), ethers.parseUnits("30", 18))).wait();
    await (await token.connect(subscriber).approve(await subc.getAddress(), ethers.parseUnits("30", 18))).wait();

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const anchor = now - Number(6n * 24n * 60n * 60n); // casi fin de período -> prorrateo pequeño
    const subId = Number((await (await subc.connect(subscriber).subscribe(planId, anchor, true)).wait())!.logs[1]!.args![0]);

    const nextChargeTs = (await subc.subs(subId)).nextChargeTs;
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(nextChargeTs) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Cobro: no debe revertir aunque falte saldo, y arrears > 0
    await (await subc.connect(operator).chargeDue(subId)).wait();
    const s = await subc.subs(subId);
    expect(s.arrears > 0n).to.equal(true);
  });
});


