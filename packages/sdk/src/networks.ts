export type ChainId = 5 | 17000 | 80002 | 31337; 
export const CHAINS: Record<ChainId, string> = { 
5: "goerli", 
17000: "holesky", 
80002: "polygon-amoy", 
31337: "anvil" 
}; 
