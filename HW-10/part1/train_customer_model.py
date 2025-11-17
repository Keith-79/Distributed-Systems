# train_customer_model.py
import pickle
import numpy as np
from sklearn.cluster import KMeans

# --- Configs ---
N_SAMPLES = 200
FEATURE_NAMES = ["Annual Income (k$)", "Spending Score (1-100)"]
INCOME_RANGE = (15.0, 150.0)
SCORE_RANGE = (1.0, 100.0)
RANDOM_SEED = 42

MODEL_PKL = "customer_kmeans_model_keith_gonsalves.pkl"
METADATA_PKL = "customer_metadata.pkl"

def simulate_data(n=200, income_range=(15.0, 150.0), score_range=(1.0, 100.0), seed=42):
    rng = np.random.default_rng(seed)
    incomes = rng.uniform(income_range[0], income_range[1], size=n)
    scores = rng.uniform(score_range[0], score_range[1], size=n)
    X = np.column_stack([incomes, scores])
    return X

def main():
    # 1) Simulate data
    X = simulate_data(N_SAMPLES, INCOME_RANGE, SCORE_RANGE, RANDOM_SEED)

    # 2) Train K-Means model
    kmeans = KMeans(n_clusters=5, n_init="auto", random_state=RANDOM_SEED)
    kmeans.fit(X)

    # 3) Save model
    with open(MODEL_PKL, "wb") as f:
        pickle.dump(kmeans, f)

    # 4) Save metadata
    metadata = {
        "feature_names": FEATURE_NAMES,
        "cluster_centers": kmeans.cluster_centers_,
        "random_seed": RANDOM_SEED,
        "n_samples": N_SAMPLES,
        "income_range": INCOME_RANGE,
        "score_range": SCORE_RANGE
    }
    with open(METADATA_PKL, "wb") as f:
        pickle.dump(metadata, f)

    print("✓ Training complete.")
    print(f"Model saved to: {MODEL_PKL}")
    print(f"Metadata saved to: {METADATA_PKL}")
    print("Cluster centers (income_k$, score):")
    print(metadata["cluster_centers"])

if __name__ == "__main__":
    main()
