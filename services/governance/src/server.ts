import express from "express";
import { mirrorToIPFS } from "./ipfs.js";
import { mirrorToArweave } from "./arweave.js";
import { createSnapshotProposal } from "./snapshot.js";
import { register } from "prom-client";
import { setParticipation } from "./metrics.js";
import { ethers } from "ethers";
import proposalsMock from "./proposals.mock.js";

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
  const governor = new ethers.Contract(
    process.env.GOVERNOR!, // dirección governor
    [
      "function proposalVotes(uint256) view returns (uint256 againstVotes,uint256 forVotes,uint256 abstainVotes)",
      "function quorum(uint256) view returns (uint256)",
      "function proposalSnapshot(uint256) view returns (uint256)",
    ],
    new ethers.JsonRpcProvider(process.env.ALCHEMY_URL)
  );
  const token = new ethers.Contract(
    process.env.TOKEN!,
    ["function getPastTotalSupply(uint256) view returns (uint256)"],
  governor.runner
  );

  const pid = req.params.proposalId;
  const snap = await governor.proposalSnapshot(pid);
  const { forVotes, abstainVotes } = await governor.proposalVotes(pid);
  const total = await token.getPastTotalSupply(snap);

  const participation = Number(forVotes + abstainVotes) / Number(total);
  setParticipation(pid, participation);
  res.json({ proposalId: pid, participation });
});

const PORT = Number(process.env.PORT || 8010);
app.listen(PORT, () => console.log(`governance API listening on :${PORT}`));
