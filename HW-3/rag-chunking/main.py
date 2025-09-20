from pathlib import Path
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

DATA_PATH = Path("data/input.txt")

def load_text(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing dataset at {path}.")
    return path.read_text(encoding="utf-8", errors="ignore")

def main():
    text = load_text(DATA_PATH)
    print(f"[dataset] chars={len(text):,}")
    print(f"[dataset] preview:\\n{text[:300].replace('\\n', ' ')}...\\n")

    emb = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vec = emb.get_text_embedding("hello tiny shakespeare")
    print(f"[embedding] model=all-MiniLM-L6-v2 dim={len(vec)}")

if __name__ == "__main__":
    main()
