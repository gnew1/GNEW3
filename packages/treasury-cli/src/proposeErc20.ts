import "dotenv/config";
import { ethers, BigNumberish } from "ethers";
import { fileURLToPath } from "url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getProvider, getSigner, getSafeSdk, getSafeService, getThresholdAndApprovals } from "./safe.js";
import { evaluatePolicy, logDecision } from "./opa.js";
import { PolicyInput, Role, FundKind } from "./types.js";
import { bnToString } from "./bignumber.js";

export const ERC20_ABI = ["function transfer(address to,uint256 amount) returns (bool)"];

export interface Erc20Args {
  safe: string;
  token: string;
  to: string;
  amount: BigNumberish;
  role: Role;
}

export interface Erc20Meta {
  chainId: number;
  fundKind: FundKind;
  threshold: number;
  approvals: number;
  initiator: string;
  now?: Date;
}

export const buildErc20PolicyInput = (args: Erc20Args, meta: Erc20Meta): { input: PolicyInput; data: string } => {
  const now = meta.now ?? new Date();
  const iface = new ethers.Interface(ERC20_ABI);
  const data = iface.encodeFunctionData("transfer", [args.to, bnToString(args.amount)]);
  const input: PolicyInput = {
    initiator: { address: meta.initiator, role: Role.parse(args.role) },
    tx: {
      safe: args.safe.toLowerCase(),
      to: args.token.toLowerCase(),
      valueWei: "0",
      token: args.token.toLowerCase(),
      data,
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
  return { input, data };
};

const cli = yargs<Erc20Args>(hideBin(process.argv))
  .option("safe", { type: "string", default: process.env.DEFAULT_SAFE_ADDRESS, demandOption: true })
  .option("token", { type: "string", demandOption: true })
  .option("to", { type: "string", demandOption: true })
  .option("amount", { type: "string", demandOption: true, describe: "Token units (raw, not decimals-adjusted)" })
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

  const { input, data } = buildErc20PolicyInput(args, {
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

  const txData = { to: args.token, data, value: "0" };
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
