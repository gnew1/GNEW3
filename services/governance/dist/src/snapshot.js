import snapshot from "@snapshot-labs/snapshot.js";
// Rely on method parameter types from the client to avoid depending on internal type exports
import { Wallet, JsonRpcProvider } from "ethers";
import { mirrorToIPFS } from "./ipfs.js";
const hub = new snapshot.Client712("https://hub.snapshot.org");
const SPACE = process.env.SNAPSHOT_SPACE;
const PK = process.env.SNAPSHOT_PK;
const RPC = process.env.SNAPSHOT_RPC;
export async function createSnapshotProposal(p) {
    const provider = new JsonRpcProvider(RPC);
    const wallet = new Wallet(PK, provider);
    const message = {
        space: SPACE,
        type: "single-choice",
        title: p.title,
        body: p.body,
        choices: p.choices,
        start: p.start,
        end: p.end,
        snapshot: await provider.getBlockNumber(),
        discussion: "",
        plugins: JSON.stringify({}),
    };
    const ipfsCid = await mirrorToIPFS({
        ...message,
        mirroredAt: Date.now(),
        metadata: { quorum: p.quorum, ...(p.metadata || {}) }
    });
    const receipt = await hub.proposal(wallet, wallet.address, message);
    return { ipfsCid, receipt };
}
