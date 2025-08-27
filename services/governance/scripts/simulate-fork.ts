import { ethers } from "hardhat";
import type { AddressLike, Signer } from "ethers";
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
  const receipt = await tx.wait();
  
  const event = receipt?.logs.find(
    (log) => log instanceof ethers.EventLog && log.fragment?.name === "ProposalCreated"
  ) as ethers.EventLog;
  
  return event?.args?.proposalId as ProposalId;
}

async function vote(
  governor: GnewGovernor,
  voter: Signer,
  proposalId: ProposalId,
  support: VoteType
) {
  await (await governor.connect(voter).castVote(proposalId, support)).wait();
}

async function main() {
  console.log("🗳️  Simulando fork de governance...");

  // Setup de accounts
  const [, proposer, voterA, voterB] = await ethers.getSigners();

  // Conectar contratos desde .env
  const token = (await ethers.getContractAt(
    "GnewGovToken",
    process.env.TOKEN!
  )) as unknown as GnewGovToken;
  
  const governor = (await ethers.getContractAt(
    "GnewGovernor", 
    process.env.GOVERNOR!
  )) as unknown as GnewGovernor;

  // Delegar poder de voto
  await delegate(token, voterA);
  await delegate(token, voterB);

  // Crear propuesta simple: actualizar delay del timelock
  const timelock = await ethers.getContractAt(
    "GNEWTimelock",
    process.env.TIMELOCK as AddressLike
  );
  
  const calldata = timelock.interface.encodeFunctionData("updateDelay", [3600]); // 1 hora
  const description = "Actualizar delay del timelock a 1 hora";
  
  const proposalId = await propose(governor, proposer, await timelock.getAddress(), calldata, description);
  
  console.log(`✅ Propuesta creada: ${proposalId}`);

  // Avanzar a periodo de votación
  const votingDelay = await governor.votingDelay();
  await ethers.provider.send("evm_mine", []);
  for (let i = 0; i < Number(votingDelay); i++) {
    await ethers.provider.send("evm_mine", []);
  }

  // Votar
  await vote(governor, voterA, proposalId, VoteType.For);
  await vote(governor, voterB, proposalId, VoteType.For);
  
  console.log("✅ Votos emitidos");

  // Avanzar periodo de votación
  const votingPeriod = await governor.votingPeriod();
  for (let i = 0; i < Number(votingPeriod); i++) {
    await ethers.provider.send("evm_mine", []);
  }

  // Verificar estado final
  const state = await governor.state(proposalId);
  console.log(`🏁 Estado final de propuesta: ${state}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });