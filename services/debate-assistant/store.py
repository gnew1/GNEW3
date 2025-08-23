""" 
Almacenamiento de embeddings + recuperación (RAG). - Usa FAISS si está disponible; en fallback usa matriz numpy y coseno. - Persiste en memoria; en producción: sustituir por disco/s3 + 
snapshot. 
""" 
from __future__ import annotations 
from typing import List, Tuple, Dict 
import numpy as np 
 
try: 
    import faiss  # type: ignore 
    HAS_FAISS = True 
except Exception: 
    faiss = None 
    HAS_FAISS = False 
 
class VectorStore: 
    def __init__(self, dim: int): 
        self.dim = dim 
        self.docs: List[Dict] = [] 
        self.embs: List[np.ndarray] = [] 
        self._index = None 
 
    def _ensure_index(self): 
        if self._index is not None: 
            return 
        if not self.embs: 
            return 
        mat = np.vstack(self.embs).astype("float32") 
        if HAS_FAISS: 
            index = faiss.IndexFlatIP(self.dim) 
            faiss.normalize_L2(mat) 
            index.add(mat) 
            self._index = index 
        else: 
            # fallback: usamos la propia matriz 
            self._index = mat / (np.linalg.norm(mat, axis=1, 
keepdims=True) + 1e-12) 
 
    def add(self, embeddings: np.ndarray, payloads: List[Dict]): 
        assert embeddings.shape[0] == len(payloads) 
        for i in range(embeddings.shape[0]): 
            self.embs.append(embeddings[i]) 
            self.docs.append(payloads[i]) 
        self._index = None  # invalidar 
 
    def search(self, query: np.ndarray, top_k: int = 5) -> 
List[Tuple[float, Dict]]: 
        self._ensure_index() 
        if self._index is None or not self.embs: 
            return [] 
        q = query.astype("float32") 
        if HAS_FAISS: 
            faiss.normalize_L2(q.reshape(1, -1)) 
            D, I = self._index.search(q.reshape(1, -1), top_k) 
            results = [(float(D[0, j]), self.docs[I[0, j]]) for j in 
range(I.shape[1]) if I[0, j] != -1] 
        else: 
            mat = self._index  # normalized 
            qn = q / (np.linalg.norm(q) + 1e-12) 
            sims = mat @ qn 
            idx = np.argsort(-sims)[:top_k] 
            results = [(float(sims[i]), self.docs[i]) for i in idx] 
        return results 
 
 
