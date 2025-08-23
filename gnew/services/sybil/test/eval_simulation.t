 est.py 
""" 
Simulación de ensayo: medimos caída de sybil y FPR. 
Datos de ejemplo: 
 - 200 usuarios, 60 sybil (etiqueta=1), 140 legítimos (etiqueta=0). 
 - Riesgo generado a partir de mezclas de señales (mock). 
""" 
import random, statistics 
 
def simulate(n_legit=140, n_sybil=60, seed=7): 
    random.seed(seed) 
    legit = [max(0.0, min(1.0, random.gauss(0.15, 0.07))) for _ in 
range(n_legit)] 
    sybil = [max(0.0, min(1.0, random.gauss(0.65, 0.15))) for _ in 
range(n_sybil)] 
    cutoff = 0.5 
    tp = sum(1 for r in sybil if r>cutoff) 
    fn = sum(1 for r in sybil if r<=cutoff) 
    fp = sum(1 for r in legit if r>cutoff) 
    tn = sum(1 for r in legit if r<=cutoff) 
    drop = tp/(tp+fn)  # % de sybil bloqueado 
    fpr = fp/(fp+tn) 
    return drop, fpr 
 
def test_drop_and_fpr(): 
    drop, fpr = simulate() 
    assert drop >= 0.70 
    assert fpr <= 0.05 
 
 
