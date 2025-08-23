""" 
CLI: 
  python -m services.reputation.src.cli ingest.jsonl --config 
config/formula.v1.yaml --epoch 20250819 --out /tmp/out 
  (ingest.jsonl contiene eventos por línea: {"user": "...", 
"kind":"vote", "value":1, "ts": 1690000000, "meta": {...}}) 
""" 
import argparse, json, yaml, os, math 
from .scoring import ReputationScorer, Event, build_audit_artifacts, 
UserScore 
from .merkle import Leaf, build_merkle, build_proof, keccak_hex 
 
def main(): 
    ap = argparse.ArgumentParser() 
    ap.add_argument("ingest") 
    ap.add_argument("--config", required=True) 
    ap.add_argument("--epoch", type=int, required=True) 
    ap.add_argument("--out", required=True) 
    args = ap.parse_args() 
 
    cfg = yaml.safe_load(open(args.config)) 
    scorer = ReputationScorer(cfg) 
    events_by_user = {} 
    with open(args.ingest) as f: 
        for line in f: 
            o = json.loads(line) 
            e = Event(o["user"].lower(), o["kind"], float(o["value"]), 
int(o["ts"]), o.get("meta", {})) 
            events_by_user.setdefault(e.user, []).append(e) 
 
    scores=[] 
    for user, evs in events_by_user.items(): 
        scores.append(scorer.score_user(sorted(evs, key=lambda x: 
x.ts))) 
 
    # Artefactos de auditoría 
    scores_buf, meta = build_audit_artifacts(scores, cfg, 
cfg["version"]) 
 
    # Merkle 
    leaves = [Leaf(s.user, int(round(s.score*1000)), cfg["version"]) 
for s in scores] 
    root, leaf_hashes = build_merkle(leaves) 
    root_hex = keccak_hex(root) 
 
    os.makedirs(args.out, exist_ok=True) 
    open(os.path.join(args.out, "scores.jsonl"), 
"wb").write(scores_buf) 
    open(os.path.join(args.out, "meta.json"), 
"w").write(json.dumps({**meta, "epoch": args.epoch, "merkleRoot": 
root_hex})) 
    open(os.path.join(args.out, "leaves.json"), 
"w").write(json.dumps([ 
        {"user": l.user, "score": l.score, "version": l.version} for l 
in leaves 
    ])) 
 
    print(json.dumps({"ok": True, "epoch": args.epoch, "merkleRoot": 
root_hex, **meta})) 
 
if __name__ == "__main__": 
main() 
