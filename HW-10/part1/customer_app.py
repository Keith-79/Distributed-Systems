# customer_app.py
import os
import pickle
import numpy as np
import streamlit as st
import matplotlib.pyplot as plt

st.set_page_config(page_title="Customer Segmentation (K-Means)", page_icon="🧩", layout="centered")

# ---- Compatibility for older Streamlit versions ----
try:
    cache_resource = st.cache_resource  # Streamlit >= 1.18
except AttributeError:
    # Fallback for older versions
    cache_resource = st.cache  # type: ignore

MODEL_FILE = "customer_kmeans_model_keith_gonsalves.pkl"
METADATA_FILE = "customer_metadata.pkl"

st.title("🧩 Customer Segmentation with K-Means (k=5)")
st.caption("Predict a customer's cluster from Annual Income (k$) and Spending Score (1–100).")

# ---- Early visibility: show cwd and file presence ----
with st.expander("Debug: environment & files", expanded=False):
    st.write("Working directory:", os.getcwd())
    st.write("Script directory:", os.path.dirname(__file__))
    st.write("Files in script dir:", os.listdir(os.path.dirname(__file__) or "."))

    st.write("Model exists?", os.path.exists(MODEL_FILE))
    st.write("Metadata exists?", os.path.exists(METADATA_FILE))

@cache_resource
def load_resources(model_file, metadata_file):
    if not os.path.exists(model_file) or not os.path.exists(metadata_file):
        raise FileNotFoundError(
            f"Missing files. Model: {os.path.exists(model_file)}, Metadata: {os.path.exists(metadata_file)}"
        )
    with open(model_file, "rb") as f:
        model = pickle.load(f)
    with open(metadata_file, "rb") as f:
        metadata = pickle.load(f)
    return model, metadata

def regenerate_data(n, income_range, score_range, seed):
    rng = np.random.default_rng(seed)
    incomes = rng.uniform(income_range[0], income_range[1], size=n)
    scores  = rng.uniform(score_range[0], score_range[1], size=n)
    return np.column_stack([incomes, scores])

# ---- Try to load; show errors nicely instead of blank screen ----
load_ok = True
try:
    model, metadata = load_resources(MODEL_FILE, METADATA_FILE)
except Exception as e:
    load_ok = False
    st.error(f"Could not load model/metadata: {e}")
    st.info("Run `python train_customer_model.py` in this folder, then refresh.")
    # Render something so page isn't blank
    st.stop()

if load_ok and model is not None:
    feature_names = metadata.get("feature_names", ["Annual Income (k$)", "Spending Score (1-100)"])
    n_samples     = int(metadata.get("n_samples", 200))
    seed          = int(metadata.get("random_seed", 42))
    income_range  = tuple(metadata.get("income_range", (15.0, 150.0)))
    score_range   = tuple(metadata.get("score_range", (1.0, 100.0)))

    st.sidebar.header("Customer Input")
    annual_income  = st.sidebar.slider(feature_names[0], float(income_range[0]), float(income_range[1]), float(np.mean(income_range)))
    spending_score = st.sidebar.slider(feature_names[1], float(score_range[0]), float(score_range[1]), float(np.mean(score_range)))

    x_user = np.array([[annual_income, spending_score]])

    try:
        cluster_id = int(model.predict(x_user)[0])
    except Exception as e:
        st.error(f"Prediction error: {e}")
        st.stop()

    st.subheader("Prediction")
    st.metric(label="Predicted Cluster ID", value=str(cluster_id))

    # Recreate the original dataset & labels for plotting
    X = regenerate_data(n_samples, income_range, score_range, seed)
    try:
        labels = model.predict(X)
    except Exception as e:
        st.error(f"Clustering label computation error: {e}")
        st.stop()

    st.subheader("Customer Position vs. Simulated Dataset")
    fig, ax = plt.subplots()
    sc = ax.scatter(X[:, 0], X[:, 1], c=labels, alpha=0.7)
    ax.scatter(x_user[0, 0], x_user[0, 1], s=180, marker="X", edgecolor="black", linewidth=1.5)
    ax.set_xlabel(feature_names[0])
    ax.set_ylabel(feature_names[1])
    ax.set_title("K-Means Clusters (k=5)")
    st.pyplot(fig)

    with st.expander("Show Cluster Centers"):
        centers = metadata.get("cluster_centers", None)
        if centers is not None:
            st.write("Centers (Annual Income, Spending Score):")
            st.write(centers)
        else:
            st.info("No centers saved in metadata.")
