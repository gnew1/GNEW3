import * as snapshot from "@snapshot-labs/snapshot.js"; 
import { Wallet } from "ethers"; 
import { JsonRpcProvider } from "ethers"; 
import { mirrorToIPFS } from "./ipfs.js"; 
export type SnapshotProposal = { 
title: string; 
body: string; 
choices: string[]; 
start: number;   // unix 
end: number;     
// unix 
quorum: number;  // % 
metadata?: Record<string, any>; 
}; 
const hub = snapshot.Client712("https://hub.snapshot.org"); 
const SPACE = process.env.SNAPSHOT_SPACE!; 
const PK = process.env.SNAPSHOT_PK!; 
const RPC = process.env.SNAPSHOT_RPC!; 
export async function createSnapshotProposal(p: SnapshotProposal) { 
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
    metadata: { quorum: p.quorum, ...(p.metadata||{}) } 
  }; 
  const ipfsCid = await mirrorToIPFS({ ...message, mirroredAt: 
Date.now() }); 
  const receipt = await hub.proposal(wallet, wallet.address, message); 
  return { ipfsCid, receipt }; 
} 
 
