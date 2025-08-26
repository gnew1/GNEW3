import "dotenv/config";
import { ethers, BigNumberish } from "ethers";
import { fileURLToPath } from "url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getProvider, getSigner, getSafeSdk, getSafeService, getThresholdAndApprovals } from "./safe.js";
import { evaluatePolicy, logDecision } from "./opa.js";
import { PolicyInput, Role, FundKind } from "./types.js";
import { ethToWei } from "./bignumber.js";

export interface TransferArgs {
  safe: string;
  to: string;
  amountEth: BigNumberish;
  note: string;
  role: Role;
}

export interface TransferMeta {
  chainId: number;
  fundKind: FundKind;
  threshold: number;
  approvals: number;
  initiator: string;
  now?: Date;
}

export const buildTransferPolicyInput = (args: TransferArgs, meta: TransferMeta): PolicyInput => {
  const now = meta.now ?? new Date();
  return {
    initiator: { address: meta.initiator, role: Role.parse(args.role) },
    tx: {
      safe: args.safe.toLowerCase(),
      to: args.to.toLowerCase(),
      valueWei: ethToWei(args.amountEth),
      token: null,
      operation: 0,
      data: "0x",
    },
    context: {
      chainId: meta.chainId,
      fundKind: FundKind.parse(meta.fundKind),
      utcHour: now.getUTCHours(),
      weekday: now.getUTCDay(),
      threshold: meta.threshold,
      currentApprovals: meta.approvals,
    },
  };
};

const cli = yargs<TransferArgs>(hideBin(process.argv))
  .option("safe", { type: "string", default: process.env.DEFAULT_SAFE_ADDRESS, demandOption: true })
  .option("to", { type: "string", demandOption: true })
  .option("amountEth", { type: "number", demandOption: true })
  .option("note", { type: "string", default: "" })
  .option("role", { type: "string", choices: Role.options, default: "FINANCE_OPS" })
  .strict();

const main = async () => {
  const args = await cli.parse();
  const { RPC_URL, CHAIN_ID, SAFE_TX_SERVICE_URL, SIGNER_PK, OPA_URL, OPA_DECISIONS_LOG, FUND_KIND } = process.env;

  if (!RPC_URL || !CHAIN_ID || !SIGNER_PK || !OPA_URL || !FUND_KIND || !SAFE_TX_SERVICE_URL) {
    throw new Error("Missing env: RPC_URL, CHAIN_ID, SIGNER_PK, OPA_URL, FUND_KIND, SAFE_TX_SERVICE_URL");
  }

  const provider = getProvider(RPC_URL);
  const signer = getSigner(provider, SIGNER_PK);
  const safe = await getSafeSdk(args.safe, signer);
  const service = getSafeService(SAFE_TX_SERVICE_URL, Number(CHAIN_ID));

  const { threshold, approvals } = await getThresholdAndApprovals(service, args.safe);

  const input = buildTransferPolicyInput(args, {
    chainId: Number(CHAIN_ID),
    fundKind: FundKind.parse(FUND_KIND),
    threshold,
    approvals,
    initiator: await signer.getAddress(),
  });

  const decision = await evaluatePolicy(OPA_URL, input);
  await logDecision(OPA_DECISIONS_LOG, { input, decision });

  if (!decision.allow) {
    console.error("⛔ Política rechazó la transacción:", decision.reasons);
    process.exit(2);
  }

  const txData = {
    to: args.to,
    data: "0x",
    value: input.tx.valueWei,
  };

  const safeTx = await safe.createTransaction({ transactions: [txData] });
  const sender = await signer.getAddress();
  const safeTxHash = await safe.getTransactionHash(safeTx);
  const senderSig = await signer.signMessage(ethers.getBytes(safeTxHash));

  const response = await service.proposeTransaction({
    safeAddress: args.safe,
    safeTransactionData: safeTx.data,
    safeTxHash,
    senderAddress: sender,
    senderSignature: senderSig,
  });

  console.log("✅ Propuesta enviada al Safe Tx Service:", response);
};

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  main();
}

export default main;
