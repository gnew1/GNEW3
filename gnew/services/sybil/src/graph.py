from collections import defaultdict, Counter 
from dataclasses import dataclass 
from typing import Dict, List, Tuple 
import math, time 
 
@dataclass 
class EdgeEv:  # evento de arista 
    a: str 
    b: str 
    etype: str 
    ts: int 
    value: float 
 
def decay_weight(alpha: float, half_life_days: float, dt_sec: 
float)->float: 
    lam = math.log(2.0)/(half_life_days*86400.0) 
    return alpha * math.exp(-lam*max(0.0, dt_sec)) 
 
class KGraph: 
    def __init__(self, cfg: dict, now:int=None): 
        self.cfg = cfg; self.now = now or int(time.time()) 
        self.neigh: Dict[str, Dict[str, float]] = defaultdict(lambda: 
defaultdict(float)) 
        self.types: Dict[Tuple[str,str], Counter] = 
defaultdict(Counter) 
        self.triangles: Dict[str, int] = defaultdict(int) 
        self.deg: Dict[str, int] = defaultdict(int) 
 
    def add_edge_event(self, ev: EdgeEv): 
        # aplica filtros por tipo (ej: max_value_eth para 
onchain_transfer) 
        typ = self.cfg["graph"]["edge_types"].get(ev.etype) 
        if not typ: return 
        if "max_value_eth" in typ and ev.value > 
float(typ["max_value_eth"]): return 
        w = decay_weight(typ["w"], typ["half_life_days"], self.now - 
ev.ts) 
        if w < self.cfg["graph"]["min_edge_weight"]: return 
        a,b = sorted([ev.a.lower(), ev.b.lower()]) 
        self.neigh[a][b] += w 
        self.neigh[b][a] += w 
        self.types[(a,b)][ev.etype]+=1 
 
    def compute_degrees(self): 
        for u, nbrs in self.neigh.items(): self.deg[u] = sum(1 for _ 
in nbrs) 
 
    def k_core(self): 
        # degeneracy ordering approx 
        self.compute_degrees() 
        core = dict(self.deg) 
        import heapq 
        heap = [(deg,u) for u,deg in core.items()] 
        heapq.heapify(heap) 
        removed=set() 
        while heap: 
            d,u = heapq.heappop(heap) 
            if u in removed: continue 
            removed.add(u) 
            for v in self.neigh[u].keys(): 
                if v in removed: continue 
                core[v] = max(0, core[v]-1) 
                heapq.heappush(heap,(core[v],v)) 
        return core 
 
    def clustering_triangles(self): 
        # cuenta triángulos aproximando por intersección de 
vecindarios 
        for u,nbrs in self.neigh.items(): 
            nbr_list = list(nbrs.keys()) 
            tri=0 
            for i in range(len(nbr_list)): 
                A = set(self.neigh[nbr_list[i]].keys()) 
                for j in range(i+1,len(nbr_list)): 
                    if nbr_list[j] in A: tri+=1 
            self.triangles[u]=tri 
 
    def conductance_to_seeds(self, seeds:set): 
        # #edges que cruzan hacia seeds / #edges totales (aprox) 
        phi={} 
        for u,nbrs in self.neigh.items(): 
            if not nbrs: phi[u]=0.0; continue 
            cross = sum(1 for v in nbrs if v in seeds) 
            phi[u] = cross/max(1,len(nbrs)) 
        return phi 
 
    def ppr(self, seeds:set, alpha:float, tol:float): 
        # Personalized PageRank simple por power iteration 
        nodes = list(self.neigh.keys()) 
        idx = {u:i for i,u in enumerate(nodes)} 
        n=len(nodes) 
        if n==0: return {} 
        s = [0.0]*n 
        for u in seeds: 
            if u in idx: s[idx[u]] = 1.0/len(seeds) 
        p=[1.0/n]*n 
        def step(p): 
            new=[0.0]*n 
            for u in nodes: 
                i=idx[u]; deg=sum(self.neigh[u].values()) 
                if deg==0: continue 
                share = (1.0-alpha)*p[i]/deg 
                for v,w in self.neigh[u].items(): 
                    new[idx[v]] += share*w 
            for i in range(n): new[i] += alpha*s[i] 
            return new 
        delta=1 
        while delta>tol: 
            q=step(p) 
            delta=sum(abs(q[i]-p[i]) for i in range(n)) 
            p=q 
        return {u:p[idx[u]] for u in nodes} 
 
 
