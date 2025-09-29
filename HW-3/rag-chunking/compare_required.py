# compare_required.py
import time
from pathlib import Path
from typing import List, Tuple, Dict
import numpy as np
import pandas as pd

from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import (
    TokenTextSplitter,
    SemanticSplitterNodeParser,
    SentenceWindowNodeParser,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.faiss import FaissVectorStore

import faiss
import tiktoken

DATA_PATH = Path("data/input.txt")
QUERY = "Who are the two feuding houses?"
TOPK = 5

def load_text(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")

def normalize(v: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(v)
    return v / (n + 1e-12)

def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(normalize(a), normalize(b)))

def embed_texts(emb_model: HuggingFaceEmbedding, texts: List[str]) -> np.ndarray:
    vecs = [np.array(emb_model.get_text_embedding(t), dtype=np.float32) for t in texts]
    return np.vstack(vecs)

def chunk_lengths(nodes) -> Tuple[int, float]:
    lengths = [len(n.text) for n in nodes]
    return len(lengths), (float(np.mean(lengths)) if lengths else 0.0)

def build_index(nodes, emb_model) -> VectorStoreIndex:
    dim = len(emb_model.get_text_embedding("probe"))
    fa = faiss.IndexFlatIP(dim) 
    vs = FaissVectorStore(faiss_index=fa)
    sc = StorageContext.from_defaults(vector_store=vs)
    return VectorStoreIndex(nodes, storage_context=sc, embed_model=emb_model)

def run_retrieval(name: str, nodes, emb_model, query: str, topk: int = 5) -> Dict:
    qvec = np.array(emb_model.get_text_embedding(query), dtype=np.float32)
    print(f"\n=== {name} ===")
    print(f"[query] {query}")
    print(f"[query_embedding] dim={qvec.shape[0]} first8={np.round(qvec[:8], 6).tolist()}")

    index = build_index(nodes, emb_model)
    retriever = index.as_retriever(similarity_top_k=topk)

    t0 = time.time()
    hits = retriever.retrieve(query)
    t_ms = (time.time() - t0) * 1000.0

    docs = [h.node.text for h in hits]
    dvecs = embed_texts(emb_model, docs) if docs else np.zeros((0, qvec.shape[0]), dtype=np.float32)
    cosines = [cosine(qvec, dv) for dv in dvecs]

    print(f"[shapes] query={qvec.shape} docs={dvecs.shape}")
    print(f"[latency_ms] {t_ms:.2f}")

    rows = []
    for i, h in enumerate(hits, start=1):
        store_score = getattr(h, "score", None)
        score_str = f"{store_score:.4f}" if isinstance(store_score, (int, float)) else str(store_score)
        cos_sim = cosines[i-1] if i-1 < len(cosines) else float("nan")
        preview = h.node.text.replace("\n", " ")[:160] + ("..." if len(h.node.text) > 160 else "")
        clen = len(h.node.text)
        rows.append([i, score_str, f"{cos_sim:.4f}", clen, preview])

    print("\nrank | store_score | cosine_sim | chunk_len | preview")
    print("-----|-------------|------------|-----------|--------")
    for r in rows:
        print(f"{r[0]:>4} | {r[1]:>11} | {r[2]:>10} | {r[3]:>9} | {r[4]}")

    top1_cos = cosines[0] if cosines else float("nan")
    mean_at_k = float(np.mean(cosines)) if cosines else float("nan")
    n_chunks, avg_len = chunk_lengths(nodes)

    return {
        "technique": name,
        "n_chunks": n_chunks,
        "avg_chunk_len": round(avg_len, 1),
        "top1_cosine": round(top1_cos, 4) if not np.isnan(top1_cos) else None,
        "mean@k_cosine": round(mean_at_k, 4) if not np.isnan(mean_at_k) else None,
        "retrieval_latency_ms": round(t_ms, 2),
    }

def main():
    text = load_text(DATA_PATH)
    print(f"[dataset] chars={len(text):,}")

    emb = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

    QUERIES = [
        "Who are the two feuding houses?",
        "Who is Romeo in love with?"
    ]

    all_rows = []

    for query in QUERIES:
        print("\n" + "="*80)
        print(f"QUERY: {query}")
        print("="*80)

        enc = tiktoken.get_encoding("cl100k_base")
        token_splitter = TokenTextSplitter(chunk_size=256, chunk_overlap=40, tokenizer=enc.encode)
        token_nodes = token_splitter.get_nodes_from_documents([Document(text=text)])
        r1 = run_retrieval("TokenTextSplitter", token_nodes, emb, query, TOPK)

        sem_splitter = SemanticSplitterNodeParser.from_defaults(
            embed_model=emb,
            breakpoint_percentile_threshold=95,
        )
        sem_nodes = sem_splitter.get_nodes_from_documents([Document(text=text)])
        r2 = run_retrieval("SemanticSplitter", sem_nodes, emb, query, TOPK)

        try:
            import nltk
            try:
                nltk.data.find("tokenizers/punkt")
            except LookupError:
                nltk.download("punkt", quiet=True)
        except Exception:
            pass
        sent_splitter = SentenceWindowNodeParser.from_defaults(
            window_size=2,
            window_metadata_key="window",
        )
        sent_nodes = sent_splitter.get_nodes_from_documents([Document(text=text)])
        r3 = run_retrieval("SentenceWindow", sent_nodes, emb, query, TOPK)

        df_q = pd.DataFrame([r1, r2, r3], columns=[
            "technique","n_chunks","avg_chunk_len","top1_cosine","mean@k_cosine","retrieval_latency_ms"
        ])
        df_q.insert(0, "query", query)

        print("\n=== Report Metrics ===")
        print(df_q.to_string(index=False))

        all_rows.append(df_q)

if __name__ == "__main__":
    main()

