import { ethers } from "hardhat";
import type { EventLog, Signer } from "ethers";
import type { GnewGovernor, GnewGovToken } from "../typechain";

type ProposalId = bigint;
enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2,
}

async function delegate(token: GnewGovToken, signer: Signer) {
  await (await token.connect(signer).delegate(signer.address)).wait();
}

async function propose(
  governor: GnewGovernor,
  proposer: Signer,
  target: string,
  calldata: string,
  description: string
): Promise<ProposalId> {
  const tx = await governor
    .connect(proposer)
    .propose([target], [0], [calldata], description);
  const rc = await tx.wait();
  const log = rc?.logs[0] as EventLog;
  return (log.args as unknown as { proposalId: ProposalId }).proposalId;
}

async function castVote(
  governor: GnewGovernor,
  voter: Signer,
  proposalId: ProposalId,
  support: VoteType
) {
  await (
    await governor.connect(voter).castVote(proposalId, support)
  ).wait();
}
/**
 * Simula en red fork: propuesta -> votación -> cola -> ejecución.
 * Control: ejecución sin fallos y cómputo de abstenciones.
 */
async function main() {
  const [proposer, voterA, voterB] = await ethers.getSigners();
  const governor = (await ethers.getContractAt(
    "GnewGovernor",
    process.env.GOVERNOR!
  )) as unknown as GnewGovernor;
  const token = (await ethers.getContractAt(
    "GnewGovToken",
    process.env.TOKEN!
  )) as unknown as GnewGovToken;
  await delegate(token, voterA);
  await delegate(token, voterB);

  // Crear propuesta simple: actualizar delay del timelock (ejemplo)
  const timelock = await ethers.getContractAt("GNEWTimelock", process.env.TIMELOCK!);
  const newDelay = 3 * 24 * 60 * 60;
  const calldata = timelock.interface.encodeFunctionData("updateDelay", [newDelay]);

  const proposalId = await propose(
    governor,
    proposer,
    timelock.target as string,
    calldata,
    "Proposal: Update timelock delay to 3 days"
  );

  // Avanza a la votación y vota con ABSTAIN incluido (control: abstención calculada)
  await ethers.provider.send("hardhat_mine", ["0x1000"]); // ~votingDelay
  await castVote(governor, voterA, proposalId, VoteType.For);
  await castVote(governor, voterB, proposalId, VoteType.Abstain);

  await ethers.provider.send("hardhat_mine", ["0x10000"]); // ~votingPeriod

  // Cola y ejecución
  const descHash = ethers.id("Proposal: Update timelock delay to 3 days");
  await (await governor.queue([timelock.target], [0], [calldata], descHash)).wait();

  // Avanza delay
  const delay = await timelock.getMinDelay();
  await ethers.provider.send("evm_increaseTime", [Number(delay)]);
  await ethers.provider.send("evm_mine", []);

  await (await governor.execute([timelock.target], [0], [calldata], descHash)).wait();
  console.log("Simulation OK: executed without failures.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
