""" 
Ejecución: 
  python -m services.sybil.src.pipeline interactions.jsonl seeds.json --config config/formula.v1.yaml --epoch 20250819 --out /tmp/sybil 
""" 
import json, yaml, os, time, hashlib 
from typing import Dict, Any 
from .graph import KGraph, EdgeEv 
from .score import UserSignals, risk_score 
from services.reputation.src.merkle import Leaf, build_merkle, 
keccak_hex  # reuso N124 
 
def sha3_hex(b: bytes)->str: 
    try: 
        import sha3; k=sha3.keccak_256(); k.update(b); return 
"0x"+k.hexdigest() 
    except Exception: 
        return "0x"+hashlib.sha256(b).hexdigest() 
 
def main(): 
    import argparse 
    ap = argparse.ArgumentParser() 
    ap.add_argument("interactions") # JSONL de EdgeEv + metadatos de 
usuario (edad, stake, VC, device) 
    ap.add_argument("seeds")        # JSON con lista de addresses seed 
(o reglas para resolver seeds vía N121-122-123) 
    ap.add_argument("--config", required=True) 
    ap.add_argument("--epoch", type=int, required=True) 
    ap.add_argument("--out", required=True) 
    args = ap.parse_args() 
 
    cfg = yaml.safe_load(open(args.config)) 
    now = int(time.time()) 
    kg = KGraph(cfg, now) 
 
    # Construir grafo 
    with open(args.interactions) as f: 
        for line in f: 
            o = json.loads(line) 
            kg.add_edge_event(EdgeEv(o["a"], o["b"], o["etype"], 
int(o["ts"]), float(o.get("value",0)))) 
 
    kg.clustering_triangles() 
    core = kg.k_core() 
    with open(args.seeds) as sf: 
        S = set(json.load(sf)["seeds"]) 
 
    ppr = kg.ppr(S, cfg["ppr"]["alpha"], cfg["ppr"]["tol"]) 
    phi = kg.conductance_to_seeds(S) 
 
    # Cargar señales de usuario complementarias 
    # form: {"user": "...", "age_days": X, "stake_norm": 0..1, 
"vc_score":0..1, "device_diversity":0..1} 
    ext: Dict[str, Any] = {} 
    extras_path = args.interactions + ".users.json" 
    if os.path.exists(extras_path): 
        ext_list = json.load(open(extras_path)) 
        for x in ext_list: ext[x["user"].lower()] = x 
 
    # Score por usuario 
    users = set(list(ppr.keys()) + list(core.keys())) 
    out=[] 
    for u in users: 
        sig = UserSignals( 
            ppr=float(ppr.get(u,0.0)), 
            core=int(core.get(u,0)), 
            conductance=float(phi.get(u,0.0)), 
            age_days=float(ext.get(u,{}).get("age_days",0.0)), 
            stake_norm=float(ext.get(u,{}).get("stake_norm",0.0)), 
            vc_score=float(ext.get(u,{}).get("vc_score",0.0)), 
            
device_diversity=float(ext.get(u,{}).get("device_diversity",0.5)), 
            triangles=int(kg.triangles.get(u,0)) 
        ) 
        risk = risk_score(sig, cfg) 
        out.append({"user": u, "risk": risk, "signals": sig.__dict__}) 
 
    # Artefactos 
    os.makedirs(args.out, exist_ok=True) 
    json.dump(out, open(os.path.join(args.out,"risk.json"),"w")) 
 
    # Merkle (leaf = (user, riskMilli, version)) 
    leaves=[Leaf(o["user"], int(round(o["risk"]*1000)), 
cfg["version"]) for o in out] 
    root, _ = build_merkle(leaves) 
    meta={ 
        "epoch": args.epoch, 
        "merkleRoot": keccak_hex(root), 
        "formulaHash": sha3_hex(json.dumps(cfg, 
sort_keys=True).encode()), 
        "codeHash": sha3_hex(open(__file__,"rb").read()), 
        "version": cfg["version"] 
    } 
    json.dump(meta, open(os.path.join(args.out,"meta.json"),"w")) 
    print(json.dumps({"ok":True, **meta})) 
if __name__=="__main__": 
    main() 
 
 
