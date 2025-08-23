""" 
Pipelines de: - Embeddings & RAG - Resumen (abstractive si hay modelo; extractive fallback) - QA extractiva - Topic modeling (TF-IDF + NMF) y etiquetas - Detección de agenda (heurísticos) 
""" 
from __future__ import annotations 
from typing import List, Dict, Tuple 
import re 
import json 
import numpy as np 
from sklearn.feature_extraction.text import TfidfVectorizer 
from sklearn.decomposition import NMF 
 
# ===== Embeddings ===== 
_EMB_DIM = 384 
_SENT_EMB = None 
_SUMM = None 
_QA = None 
 
def _ensure_nltk(): 
    try: 
        import nltk  # type: ignore 
        nltk.data.find("tokenizers/punkt") 
    except Exception: 
        try: 
            import nltk 
            nltk.download("punkt", quiet=True) 
        except Exception: 
            pass 
 
def _embed_sentences(texts: List[str]) -> np.ndarray: 
    global _SENT_EMB 
    try: 
        if _SENT_EMB is None: 
            from sentence_transformers import SentenceTransformer  # 
type: ignore 
            _SENT_EMB = SentenceTransformer("all-MiniLM-L6-v2") 
        vecs = _SENT_EMB.encode(texts, normalize_embeddings=True) 
        return np.asarray(vecs, dtype="float32") 
    except Exception: 
        # Fallback con TF-IDF promediado 
        tfidf = TfidfVectorizer(max_features=_EMB_DIM) 
        X = tfidf.fit_transform(texts) 
        return X.toarray().astype("float32") 
 
# ===== Summarization ===== 
def summarize(text: str, max_sentences: int = 6) -> str: 
    global _SUMM 
    text = re.sub(r"\s+", " ", text).strip() 
    if not text: 
        return "" 
    try: 
        if _SUMM is None: 
            from transformers import pipeline  # type: ignore 
            _SUMM = pipeline("summarization", 
model="sshleifer/distilbart-cnn-12-6") 
        out = _SUMM(text, max_length=230, min_length=80, 
do_sample=False)[0]["summary_text"] 
        return out 
    except Exception: 
        # Extractive fallback: TF-IDF sentence ranking 
        _ensure_nltk() 
        sents = re.split(r"(?<=[\.\!\?])\s+", text) 
        vec = TfidfVectorizer() 
        X = vec.fit_transform(sents) 
        scores = X.sum(axis=1).A.flatten() 
        idx = np.argsort(-scores)[:max_sentences] 
        idx.sort() 
        return " ".join([sents[i] for i in idx]) 
 
# ===== Extractive QA ===== 
def qa_answer(question: str, passages: List[str]) -> Tuple[str, 
List[str]]: 
    global _QA 
    ctx = "\n".join(passages) 
    try: 
        if _QA is None: 
            from transformers import pipeline  # type: ignore 
            _QA = pipeline("question-answering", 
model="deepset/roberta-base-squad2") 
        res = _QA({"question": question, "context": ctx}) 
        answer = res.get("answer", "") 
        return answer, passages[:3] 
    except Exception: 
        # Fallback: pick sentence with most keyword overlap 
        q_terms = set(re.findall(r"\w+", question.lower())) 
        best = "" 
        best_score = 0 
        for p in passages: 
            for sent in re.split(r"(?<=[\.\!\?])\s+", p): 
                score = 
len(q_terms.intersection(set(re.findall(r"\w+", sent.lower())))) 
                if score > best_score: 
                    best_score = score 
                    best = sent 
        return best, passages[:3] 
 
# ===== Topic modeling & Tags ===== 
def topic_tags(docs: List[str], topic_k: int = 8) -> List[str]: 
    if not docs: 
        return [] 
    vec = TfidfVectorizer(max_df=0.8, min_df=1, ngram_range=(1,2), 
stop_words="english") 
    X = vec.fit_transform(docs) 
    k = min(topic_k, max(1, X.shape[0])) 
    nmf = NMF(n_components=k, init="nndsvda", random_state=0, 
max_iter=250) 
    W = nmf.fit_transform(X) 
    H = nmf.components_ 
    vocab = np.array(vec.get_feature_names_out()) 
    top = [] 
    for comp in H: 
        idx = np.argsort(-comp)[:3] 
        tag = " ".join(vocab[idx]) 
        if tag not in top: 
            top.append(tag) 
    # dedupe conservador 
    return top[:topic_k] 
 
# ===== Agenda (action items) ===== 
_ACTION_PATTERNS = [ 
    
r"\b(accion|acción|action|todo|pendiente|task|tarea)\b[:\-]\s*(.+)", 
    r"\b(decidir|definir|acordar|schedule|planificar)\b\s+(.+)", 
    r"^\s*-\s*\[ \]\s*(.+)",  # checklist sin marcar 
] 
def extract_agenda(texts: List[str]) -> List[str]: 
    items = [] 
    for t in texts: 
        lines = t.splitlines() 
        for ln in lines: 
            for pat in _ACTION_PATTERNS: 
                m = re.search(pat, ln, re.IGNORECASE) 
                if m: 
                    items.append(m.group(len(m.groups()))) 
            # Imperativo simple 
            if 
re.match(r"^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b(emos|emos|ad|en)\b", ln): 
                items.append(ln.strip()) 
    # limpios y únicos 
    clean = [] 
    seen = set() 
    for it in items: 
        it = re.sub(r"\s+", " ", it).strip(" .-") 
        if it and it.lower() not in seen: 
            seen.add(it.lower()) 
            clean.append(it) 
return clean[:12] 
# ===== RAG end-to-end ===== 
def rank_passages(query: str, passages: List[str], top_k: int = 6) -> 
List[str]: 
if not passages: 
return [] 
mat = _embed_sentences(passages) 
q = _embed_sentences([query])[0] 
sims = mat @ q 
idx = np.argsort(-sims)[:top_k] 
return [passages[i] for i in idx] 
