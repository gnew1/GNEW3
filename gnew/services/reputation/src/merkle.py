from typing import List, Tuple 
from dataclasses import dataclass 
import hashlib, math 
 
def keccak_hex(h: bytes)->str: 
    try: 
        import sha3 
        k=sha3.keccak_256(); k.update(h); return "0x"+k.hexdigest() 
    except Exception: 
        return "0x"+hashlib.sha256(h).hexdigest() 
 
@dataclass 
class Leaf: 
    user: str 
    score: int     # entero (p.ej. score*1000) 
    version: int 
 
def leaf_hash(l: Leaf) -> bytes: 
    s = f"{l.user.lower()}|{l.score}|{l.version}".encode() 
    try: 
        import sha3; k=sha3.keccak_256(); k.update(s); return 
k.digest() 
    except Exception: 
        return hashlib.sha256(s).digest() 
 
def build_merkle(leaves: List[Leaf]) -> Tuple[bytes, List[bytes]]: 
    nodes = [leaf_hash(l) for l in leaves] 
    if not nodes: return b"\x00"*32, [] 
    level = nodes 
    while len(level) > 1: 
        nxt=[] 
        for i in range(0,len(level),2): 
            a=level[i]; b=level[i+1] if i+1<len(level) else level[i] 
            try: import sha3; k=sha3.keccak_256(); k.update(a+b); 
nxt.append(k.digest()) 
            except Exception: nxt.append(hashlib.sha256(a+b).digest()) 
        level = nxt 
    return level[0], nodes 
 
def build_proof(index:int, leaves_hashes: List[bytes]) -> List[bytes]: 
    proof=[] 
    level = leaves_hashes 
    idx = index 
    while len(level) > 1: 
        nxt=[] 
        for i in range(0,len(level),2): 
            a=level[i]; b=level[i+1] if i+1<len(level) else level[i] 
            nxt.append(hashlib.sha256(a+b).digest()) 
            if i==idx or i+1==idx: 
                sib = b if i==idx else a 
                proof.append(sib) 
        level=nxt 
        idx//=2 
    return proof 
 
 
