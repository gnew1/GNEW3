import { ethers } from "hardhat";
async function main() {
    const [deployer] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("GNEWGovernanceToken");
    const initial = ethers.parseUnits(process.env.GNEW_SUPPLY ||
        "100000000", 18);
    const token = await Token.deploy(deployer.address, initial);
    await token.waitForDeployment();
    // Delegación inicial al deployer para que su poder de voto cuente 
    await (await token.connect(deployer)["delegate(address)"](deployer.address)).wait();
    const Timelock = await ethers.getContractFactory("GNEWTimelock");
    const minDelay = Number(process.env.TIMELOCK_DELAY || 2 * 24 * 60 *
        60);
    const proposers = [deployer.address];
    const executors = [ethers.ZeroAddress];
    const timelock = await Timelock.deploy(minDelay, proposers, executors, deployer.address);
    await timelock.waitForDeployment();
    const Governor = await ethers.getContractFactory("GNEWGovernor");
    const vetoer = process.env.VETOER || deployer.address;
    const votingDelayBlocks = Number(process.env.VOTING_DELAY || 7200);
    // ~1d en L1 
    const votingPeriodBlocks = Number(process.env.VOTING_PERIOD ||
        50400); // ~7d 
    const proposalThresholdVotes = ethers.parseUnits(process.env.PROPOSAL_THRESHOLD || "100000", 18);
    const quorumPercent = Number(process.env.QUORUM_PERCENT || 4);
    const gov = await Governor.deploy(token.target, timelock.target, vetoer, votingDelayBlocks, votingPeriodBlocks, proposalThresholdVotes, quorumPercent);
    await gov.waitForDeployment();
    // Transfiere el control del Timelock al Governor (bravo-like) 
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const cancellerRole = await timelock.CANCELLER_ROLE();
    await (await timelock.grantRole(proposerRole, gov.target)).wait();
    await (await timelock.grantRole(executorRole, ethers.ZeroAddress)).wait(); // cualquiera puede ejecutar 
    await (await timelock.grantRole(cancellerRole, gov.target)).wait();
    await (await timelock.revokeRole(proposerRole, deployer.address)).wait();
    console.log("gNEW token:", token.target);
    console.log("Timelock  :", timelock.target);
    console.log("Governor  :", gov.target);
}
main().catch((e) => { console.error(e); process.exit(1); });
