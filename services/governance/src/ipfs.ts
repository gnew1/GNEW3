import { create } from "ipfs-http-client"; 
const IPFS_URL = process.env.IPFS_URL || "http://localhost:5001"; 
const PROJECT_ID = process.env.IPFS_PROJECT_ID; 
const PROJECT_SECRET = process.env.IPFS_PROJECT_SECRET; 
export const ipfs = create({ 
url: IPFS_URL, 
headers: PROJECT_ID && PROJECT_SECRET ? { 
authorization: "Basic " + Buffer.from(PROJECT_ID + ":" + 
PROJECT_SECRET).toString("base64") 
} : undefined 
}); 
export async function mirrorToIPFS(obj: unknown): Promise<string> { 
const { cid } = await ipfs.add(JSON.stringify(obj, null, 2)); 
return cid.toString(); 
} 
