import argparse
from pathlib import Path
import numpy as np

from llama_index.core import Document, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.faiss import FaissVectorStore

import faiss

DATA_PATH = Path("data/input.txt")

def load_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing dataset at {path}")
    return path.read_text(encoding="utf-8", errors="ignore")

def summarize_vec(vec, n_show=8):
    arr = np.asarray(vec, dtype=np.float32)
    return {
        "dim": arr.size,
        "l2_norm": float(np.linalg.norm(arr)),
        "mean": float(arr.mean()),
        "std": float(arr.std()),
        "first_dims": [float(x) for x in arr[:n_show]],
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, default="What is the relationship between Romeo and Juliet?")
    parser.add_argument("--topk", type=int, default=5)
    # a higher threshold => fewer / bigger chunks; lower => more splits
    parser.add_argument("--breakpoint-percentile", type=int, default=95)
    args = parser.parse_args()

    # 1) load data
    text = load_text(DATA_PATH)
    print(f"[dataset] chars={len(text):,}")
    print(f"[dataset] preview: {text[:300].replace('\\n', ' ')}...\\n")

    # 2) embedding model (same as token-based for apples-to-apples)
    emb = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    dim = len(emb.get_text_embedding("probe"))
    print(f"[emb] model=all-MiniLM-L6-v2 dim={dim}")

    # 3) semantic chunking
    # Uses embeddings to find “breakpoints” (topic shifts) and split there.
    splitter = SemanticSplitterNodeParser.from_defaults(
        embed_model=emb,
        breakpoint_percentile_threshold=args.breakpoint_percentile,  # 95 is a common start
    )
    nodes = splitter.get_nodes_from_documents([Document(text=text)])
    print(f"[chunking] SemanticSplitter -> nodes={len(nodes)} (breakpoint_percentile={args.breakpoint_percentile})")

    # 4) show a couple of chunk embeddings for parity with step 3
    for i in [0, min(1, len(nodes)-1)]:
        e = emb.get_text_embedding(nodes[i].text)
        stats = summarize_vec(e)
        print(f"[emb:node {i}] {stats}")

    # 5) FAISS index (Inner Product)
    index = faiss.IndexFlatIP(dim)
    vs = FaissVectorStore(faiss_index=index)
    storage_ctx = StorageContext.from_defaults(vector_store=vs)
    rag_index = VectorStoreIndex(nodes, storage_context=storage_ctx, embed_model=emb)

    # 6) retrieval (retrieval-only; no LLM)
    retriever = rag_index.as_retriever(similarity_top_k=args.topk)
    results = retriever.retrieve(args.query)

    # 7) print retrieval results
    print(f"\n[query] {args.query}")
    for rank, n in enumerate(results, start=1):
        score = getattr(n, "score", None)
        score_str = f"{score:.4f}" if isinstance(score, (int, float)) else str(score)
        preview = n.node.text.replace("\n", " ")[:220]
        print(f"[hit {rank}] score={score_str}  text: {preview}...")

if __name__ == "__main__":
    main()
