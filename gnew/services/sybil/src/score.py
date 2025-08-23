from dataclasses import dataclass 
from typing import Dict, Any 
import math, time 
 
@dataclass 
class UserSignals: 
    ppr: float 
    core: int 
    conductance: float 
    age_days: float 
    stake_norm: float # 0..1 
    vc_score: float   # 0..1 (tipos/validez VC) 
    device_diversity: float # 0..1 (1=alta diversidad/estabilidad) 
    triangles: int 
 
def sigmoid(x): return 1.0/(1.0+math.exp(-x)) 
 
def risk_score(sig: UserSignals, cfg: Dict[str,Any]) -> float: 
    w = cfg["risk"]["weights"]; b = cfg["risk"]["bias"] 
    z = (w["ppr"]*sig.ppr + 
         w["core"]*math.log(1+sig.core) + 
         w["conductance"]*sig.conductance + 
         w["age_days"]*math.log(1+sig.age_days) + 
         w["stake_norm"]*sig.stake_norm + 
         w["vc_score"]*sig.vc_score + 
         w["device_diversity"]*sig.device_diversity) 
    r = max(cfg["risk"]["cap"][0], min(cfg["risk"]["cap"][1], 
sigmoid(b + z))) 
    return r 
 
 
