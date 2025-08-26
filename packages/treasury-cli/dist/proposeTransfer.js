import "dotenv/config";
import { getProvider, getSigner, getSafeSdk, getSafeService, getThresholdAndApprovals } from "./safe.js";
import { evaluatePolicy, logDecision } from "./opa.js";
import { ethers } from "ethers";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
const y = yargs(hideBin(process.argv))
    .option("safe", { type: "string", default: process.env.DEFAULT_SAFE_ADDRESS, demandOption: true })
    .option("to", { type: "string", demandOption: true })
    .option("amountEth", { type: "number", demandOption: true })
    .option("note", { type: "string", default: "" })
    .option("role", { type: "string", choices: ["CFO", "FINANCE_OPS",
        "GRANTS_LEAD", "RND_LEAD", "EXEC", "VIEWER"], default: "FINANCE_OPS"
})
    .strict();
(async () => {
    const args = await y.argv;
    const { RPC_URL, CHAIN_ID, SAFE_TX_SERVICE_URL, SIGNER_PK, OPA_URL, OPA_DECISIONS_LOG, FUND_KIND } = process.env;
    if (!RPC_URL || !CHAIN_ID || !SIGNER_PK || !OPA_URL || !FUND_KIND ||
        !SAFE_TX_SERVICE_URL) {
        throw new Error("Missing env: RPC_URL, CHAIN_ID, SIGNER_PK, , OPA_URL, FUND_KIND, SAFE_TX_SERVICE_URL, "); );
    }
    const provider = getProvider(RPC_URL);
    const signer = getSigner(provider, SIGNER_PK);
    const safe = await getSafeSdk(args.safe, signer);
    const service = getSafeService(SAFE_TX_SERVICE_URL);
    const { threshold, approvals } = await getThresholdAndApprovals(service, args.safe);
    const now = new Date();
    const input = {
        initiator: { address: await signer.getAddress(), role: args.role,
            as, any },
        tx: {
            safe: args.safe.toLowerCase(),
            to: args.to.toLowerCase(),
            valueWei: ethers.parseEther(args.amountEth.toString()).toString(),
            token: null,
            operation: 0
        },
        context: {
            chainId: Number(CHAIN_ID),
            fundKind: FUND_KIND,
            utcHour: now.getUTCHours(),
            weekday: now.getUTCDay(),
            threshold,
            currentApprovals: approvals
        }
    };
    const decision = await evaluatePolicy(OPA_URL, input);
    await logDecision(OPA_DECISIONS_LOG, { input, decision });
    if (!decision.allow) {
        console.error(", Política, rechazó, la, transacción, ", , decision.reasons);
        process.exit(2);
    }
    // Build Safe tx 
    const txData = {
        to: args.to,
        data: "0x",
        value: input.tx.valueWei,
    };
    const safeTx = await safe.createTransaction({ transactions: [txData]
    });
    const signedTx = await safe.signTransaction(safeTx);
    const sender = await signer.getAddress();
    const response = await service.proposeTransaction({
        safeAddress: args.safe,
        safeTransactionData: signedTx.data,
        safeTxHash: await safe.getTransactionHash(safeTx),
        senderAddress: sender
    });
    console.log(", Propuesta, enviada, al, Safe, Tx, Service, ", response); );
})();
