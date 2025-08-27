import express from "express";
import { mirrorToIPFS } from "./ipfs.js";
import { mirrorToArweave } from "./arweave.js";
import { createSnapshotProposal } from "./snapshot.js";
import { register } from "prom-client";
import { setParticipation } from "./metrics.js";
import proposalsMock from "./proposals.mock.js";
import {
  GnewGovernor__factory,
  GnewGovToken__factory
} from "@contracts-types";
import { JsonRpcProvider } from "ethers";

const provider = new JsonRpcProvider(process.env.RPC_URL!);
const signer = await provider.getSigner(0);

const governor = GnewGovernor__factory.connect(process.env.GOVERNOR_ADDRESS!, signer);
const token = GnewGovToken__factory.connect(process.env.TOKEN_ADDRESS!, signer);

if (!governor) throw new Error("Governor not initialized");
if (!token) throw new Error("Token not initialized");

const app = express();
app.use(express.json());

// Demo router
app.use("/", proposalsMock);

// GET /metrics
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// POST /mirror  -> guarda metadata de propuesta en IPFS y Arweave
app.post("/mirror", async (req, res) => {
  const payload = req.body || {};
  const ipfsCid = await mirrorToIPFS(payload);
  const arId = await mirrorToArweave(payload);
  res.json({ ipfsCid, arweaveId: arId });
});

// POST /snapshot/proposal  -> crea propuesta off-chain
app.post("/snapshot/proposal", async (req, res) => {
  const result = await createSnapshotProposal(req.body);
  res.json(result);
});

// GET /participation/:proposalId  -> calcula ratio de participación on-chain
app.get("/participation/:proposalId", async (req, res) => {
  const pid = BigInt(req.params.proposalId);
  const snap = await governor.proposalSnapshot(pid);
  const { forVotes, abstainVotes } = await governor.proposalVotes(pid);
  const total = await token.getPastTotalSupply(snap);

  const participation = Number(forVotes + abstainVotes) / Number(total);
  setParticipation(pid.toString(), participation);
  res.json({ proposalId: pid.toString(), participation });
});

const PORT = Number(process.env.PORT || 8010);
app.listen(PORT, () => console.log(`governance API listening on :${PORT}`));
