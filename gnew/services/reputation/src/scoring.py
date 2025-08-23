import math, json, hashlib, time 
from dataclasses import dataclass 
from typing import Dict, List, Any, Tuple 
from collections import defaultdict, Counter 
from datetime import datetime, timezone 
 
# --------- Tipos ---------- 
@dataclass 
class Event: 
    user: str            # "0x..." (lowercase) 
    kind: str            # "vote", "pr_merged", ... 
    value: float         # v_e 
    ts: int              # unix seconds 
    meta: Dict[str, Any] # {counterparty, quality, area, ...} 
 
@dataclass 
class ScoreItem: 
    contribution: float 
    kind: str 
    value: float 
    ts: int 
    multiplicators: Dict[str, float] 
 
@dataclass 
class UserScore: 
    user: str 
    score: float 
    items: List[ScoreItem] 
 
# --------- Utilidades ---------- 
def keccak256_bytes(b: bytes) -> bytes: 
    # hashlib no trae keccak; si no hay pysha3, usamos sha256 como 
placeholder para hash auditable 
    try: 
        import sha3 
        k = sha3.keccak_256() 
        k.update(b) 
        return k.digest() 
    except Exception: 
        return hashlib.sha256(b).digest() 
 
def logistic(alpha, b, c, x): 
    return alpha * (1.0 / (1.0 + math.exp(-b * (x - c)))) 
 
# --------- Núcleo de scoring ---------- 
class ReputationScorer: 
    def __init__(self, cfg: Dict[str, Any]): 
        self.cfg = cfg 
 
    def _half_life_lambda(self, days: float) -> float: 
        return math.log(2.0) / (days * 86400.0) 
 
    def _saturate(self, kind: str, v: float) -> float: 
        kcfg = self.cfg["features"].get(kind, {}) 
        if "vmax" in kcfg: 
            return min(v, float(kcfg["vmax"])) 
        if "clip_pct" in kcfg: 
            # clipping en percentil se aplica en preproceso; aquí 
simplificamos como clip a vmax implícita 
            return v 
        if "saturate" in kcfg and kcfg["saturate"]["type"] == 
"logistic": 
            s = kcfg["saturate"]; return logistic(s["alpha"], s["b"], 
s["c"], v) 
        return v 
 
    def _velocity_penalty(self, user_events: List[Event], kind: str, 
now: int) -> float: 
        kcfg = self.cfg["features"].get(kind, {}) 
        star = float(kcfg.get("rate_star", 5)) 
        wdays = int(self.cfg["antigaming"]["velocity"]["window_days"]) 
        window = now - wdays*86400 
        r = sum(1 for e in user_events if e.kind == kind and e.ts >= 
window) / max(1, wdays) 
        return 1.0 / (1.0 + max(0.0, r - star)/star) 
 
    def _diversity_bonus(self, user_events: List[Event], now: int) -> 
float: 
        conf = self.cfg["antigaming"]["diversity"] 
        window = now - conf["window_days"]*86400 
        kinds = [e.kind for e in user_events if e.ts >= window] 
        if not kinds: return 1.0 
        cnt = Counter(kinds) 
        total = sum(cnt.values()) 
        H = -sum((c/total) * math.log(c/total + 1e-9) for c in 
cnt.values()) 
        return min(1.0, conf["gamma0"] + conf["gamma1"] * H) 
 
    def _collusion_penalty(self, user_events: List[Event], kind: str, 
now: int) -> float: 
        conf = self.cfg["antigaming"]["collusion"] 
        window = now - conf["counterpart_window_days"]*86400 
        cps = [e.meta.get("counterparty") for e in user_events if 
e.kind==kind and e.ts >= window and e.meta.get("counterparty")] 
        if not cps: return 1.0 
        cnt = Counter(cps) 
        total = sum(cnt.values()) 
        top_ratio = max(cnt.values())/total 
        penalty = min(conf["beta_max_penalty"], top_ratio) # si 1 
contraparte concentra, mayor penalización 
        return 1.0 - penalty 
 
    def _quality_multiplier(self, e: Event) -> float: 
        q = float(e.meta.get("quality", 1.0)) 
        floor = self.cfg["antigaming"]["quality"]["floor"] 
        ceil  = self.cfg["antigaming"]["quality"]["ceil"] 
        return max(floor, min(ceil, q)) 
 
    def _id_multiplier(self, e: Event) -> float: 
        # DID verificado, stake, etc. 
        flags = e.meta.get("id_flags", {})  # {"did_verified": True, 
"stake_norm": 0.5} 
        m = 1.0 
        if flags.get("did_verified"): m *= 1.05 
        stake = float(flags.get("stake_norm", 0.0)) # 0..1 
        m *= (1.0 + min(0.15, 0.15*stake)) # cap +15% 
        return m 
 
    def score_user(self, events: List[Event], now: int=None) -> 
UserScore: 
        now = now or int(time.time()) 
        items: List[ScoreItem] = [] 
        cfg = self.cfg 
        diversity = self._diversity_bonus(events, now) 
        score = 0.0 
        for e in events: 
            if e.kind not in cfg["features"]: continue 
            kcfg = cfg["features"][e.kind] 
            lam = self._half_life_lambda(kcfg["half_life_days"]) 
            decay = math.exp(-lam * max(0, now - e.ts)) 
            v_sat = self._saturate(e.kind, e.value) 
            w = float(kcfg["w"]) 
            p_vel = self._velocity_penalty(events, e.kind, now) 
            p_col = self._collusion_penalty(events, e.kind, now) 
            p_qual= self._quality_multiplier(e) 
            p_id  = self._id_multiplier(e) 
            M = p_vel * diversity * p_col * p_qual * p_id 
            contrib = w * v_sat * decay * M 
            items.append(ScoreItem(contrib, e.kind, e.value, e.ts, { 
                "decay": decay, "p_vel": p_vel, "p_div": diversity, 
"p_col": p_col, "p_qual": p_qual, "p_id": p_id 
            })) 
            score += contrib 
        # normalización 
        alpha = float(cfg["normalization"]["alpha"]) 
        cap   = float(cfg["normalization"]["cap"]) 
        score_norm = min(cap, alpha*score) 
        return UserScore(events[0].user if events else "0x0", 
score_norm, items) 
 
# --------- Auditoría y artefactos ---------- 
def build_audit_artifacts(scores: List[UserScore], cfg: Dict[str,Any], 
formula_version:int) -> Tuple[bytes, Dict[str,Any]]: 
    # scores.jsonl + config.yml + README.audit -> IPFS en pipeline 
externo; aquí computamos hashes 
    scores_buf = "\n".join(json.dumps({ 
        "user": s.user, "score": round(s.score,3), 
        
"items":[{"kind":i.kind,"ts":i.ts,"val":i.value,"contrib":round(i.cont
 ribution,4),"mult":i.multiplicators} for i in s.items] 
    }) for s in scores).encode() 
    cfg_buf = json.dumps(cfg, sort_keys=True).encode() 
    code_hash = keccak256_bytes(open(__file__,"rb").read()) # hash del 
archivo como proxy 
    scores_hash = keccak256_bytes(scores_buf) 
    cfg_hash = keccak256_bytes(cfg_buf) 
    meta = { 
        "version": formula_version, 
        "scoresHash": "0x"+scores_hash.hex(), 
        "configHash": "0x"+cfg_hash.hex(), 
        "codeHash":   "0x"+code_hash.hex() 
    } 
    # merkle se construye aparte (ver merkle.py) 
    return scores_buf, meta 
 
 
