import { Contract, JsonRpcProvider } from "ethers"; 
const SBT_ABI = [ 
"function badgeTypes(uint256) view returns (tuple(string name,string 
description,string image,uint16 points,uint8 rarity,bool 
revocableByOwner,bool active))", 
"function badgeTypeCount() view returns (uint256)", 
"function balanceOf(address) view returns (uint256)", 
"function tokenOfOwnerByIndex(address owner,uint256 index) view 
returns (uint256)", // si añades ERC721Enumerable 
"function tokenURI(uint256) view returns (string)", 
"function locked(uint256) view returns (bool)", 
"function ownerOf(uint256) view returns (address)", 
"event BadgeMinted(uint256 indexed tokenId, address indexed to, 
uint256 indexed typeId, string tokenURI)" 
]; 
export type BadgeType = { 
name: string; description: string; image: string; 
points: number; rarity: number; revocableByOwner: boolean; active: 
boolean; 
}; 
export async function getBadgeTypes(rpc: string, contract: string): 
Promise<Record<number, BadgeType>> { 
const provider = new JsonRpcProvider(rpc); 
const sbt = new Contract(contract, SBT_ABI, provider); 
const count = Number(await sbt.badgeTypeCount()); 
  const out: Record<number, BadgeType> = {}; 
  for (let i = 1; i <= count; i++) { 
    const t = await sbt.badgeTypes(i); 
    out[i] = { 
      name: t[0], description: t[1], image: t[2], 
      points: Number(t[3]), rarity: Number(t[4]), revocableByOwner: 
t[5], active: t[6] 
    }; 
  } 
  return out; 
} 
 
export async function getBadgesOf(rpc: string, contract: string, 
owner: string, ids?: number[]) { 
  const provider = new JsonRpcProvider(rpc); 
  const sbt = new Contract(contract, SBT_ABI, provider); 
  // Nota: si NO usas ERC721Enumerable, obtén eventos 
BadgeMinted->owner y filtra; aquí asumimos enumerable. 
  const bal = Number(await sbt.balanceOf(owner)); 
  const tokenIds: number[] = []; 
  for (let i = 0; i < bal; i++) { 
    const id = Number(await sbt.tokenOfOwnerByIndex(owner, i)); 
    tokenIds.push(id); 
  } 
  const items = await Promise.all(tokenIds.map(async (id) => { 
    const uri = await sbt.tokenURI(id); 
    const l = await sbt.locked(id); 
    return { id, uri, locked: l }; 
  })); 
  return items; 
} 
 
Nota: Si no quieres ERC721Enumerable, añade un mapping 
ownerTokens[owner][] en el contrato y un getter; o usa subgraph. 
 
