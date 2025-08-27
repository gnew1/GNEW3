import { ethers } from "ethers";
import {
  GnewGovernor__factory,
  GnewGovToken__factory,
} from "@contracts-types";

async function main() {
  // proveedor y signer
  const rpc = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpc);
  const signer = await provider.getSigner(0);
  const signerAddr = await signer.getAddress();

  // instancias tipadas (¡sin genéricos!)
  const token = GnewGovToken__factory.connect(
    process.env.TOKEN_ADDRESS as string,
    signer
  );

  const governor = GnewGovernor__factory.connect(
    process.env.GOVERNOR_ADDRESS as string,
    signer
  );

  // delegate
  const d = await token.delegate(signerAddr);
  await d.wait();

  // propose
  const targets: string[] = [signerAddr];
  const values: bigint[] = [0n];
  const calldatas: string[] = ["0x"]; // placeholder
  const description = "Test proposal";

  const tx = await governor.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();

  // obtener proposalId de evento tipado
  let proposalId: bigint | undefined;
  for (const log of receipt!.logs) {
    try {
      const parsed = governor.interface.parseLog(log);
      if (parsed?.name === "ProposalCreated") {
        proposalId = parsed.args.proposalId as bigint;
        break;
      }
    } catch { /* ignore no-match */ }
  }
  if (proposalId === undefined) throw new Error("No ProposalCreated found");

  // votar
  const voteTx = await governor.castVote(proposalId, 1); // 1=For
  await voteTx.wait();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
