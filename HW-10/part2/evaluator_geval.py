# evaluator_geval.py
import os, json, re, time, argparse
from kafka import KafkaConsumer

# ---------- Config ----------
BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")

# ---------- Optional DeepEval / GEval ----------
try:
    from deepeval.metrics import GEval
    from deepeval.test_case import LLMTestCase
    HAS_DEEPEVAL = True
except Exception:
    HAS_DEEPEVAL = False

def make_judge():
    """Return an Ollama judge for GEval if USE_OLLAMA=1 and server is up; else None."""
    if not HAS_DEEPEVAL or os.getenv("USE_OLLAMA", "0") != "1":
        return None
    try:
        from deepeval.models import OllamaModel
        import requests
        requests.get("http://localhost:11434/api/tags", timeout=2)
        model = os.getenv("DEEPEVAL_MODEL", "llama3.1")
        return OllamaModel(model=model)
    except Exception:
        return None

def build_metrics(judge):
    """Build four GEval metrics; return None if something fails."""
    if not HAS_DEEPEVAL:
        return None
    try:
        m1 = GEval(
            name="Plan Quality",
            evaluation_steps=[
                "Are there 3–5 clear, actionable steps?",
                "Is ordering logical and scoped to the question?",
                "Are validations/edge cases noted?"
            ],
            evaluation_params=["input","actual_output"],
            model=judge
        )
        m2 = GEval(
            name="Draft Helpfulness",
            evaluation_steps=[
                "Directly answers the question",
                "Specific, accurate, practically useful",
                "Concise and well-structured"
            ],
            evaluation_params=["input","actual_output"],
            model=judge
        )
        m3 = GEval(
            name="Final Clarity",
            evaluation_steps=[
                "Improves organization/conciseness over draft",
                "Adds a short summary and removes redundancy"
            ],
            evaluation_params=["input","actual_output"],
            model=judge
        )
        m4 = GEval(
            name="Final vs Draft Alignment",
            evaluation_steps=[
                "Faithfully follows the draft while improving clarity/correctness"
            ],
            evaluation_params=["context","actual_output"],
            model=judge
        )
        return (m1, m2, m3, m4)
    except Exception:
        return None

# ---------- Kafka helpers ----------
def read_one(topic: str, cid: str, timeout_s: int = 20) -> dict:
    cons = KafkaConsumer(
        topic,
        bootstrap_servers=[BOOTSTRAP],
        group_id=f"eval-{topic}-{int(time.time()*1000)}",
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        key_deserializer=lambda b: b.decode("utf-8") if b else None,
        enable_auto_commit=False,
        auto_offset_reset="earliest",
    )
    end = time.time() + timeout_s
    try:
        while time.time() < end:
            polled = cons.poll(timeout_ms=800)
            for _, batch in polled.items():
                for msg in batch:
                    val = msg.value or {}
                    if val.get("correlation_id") == cid:
                        return val
        raise TimeoutError(f"Timeout waiting for topic='{topic}' cid='{cid}'")
    finally:
        cons.close()

# ---------- Text utilities ----------
def to_text(x):
    """Return a readable string from strings/dicts/other payloads."""
    if isinstance(x, str):
        return x
    if isinstance(x, dict):
        for k in ("content","text","message","body","answer","final","draft","plan"):
            v = x.get(k)
            if isinstance(v, str) and v.strip():
                return v
        return json.dumps(x, ensure_ascii=False, indent=2)
    if x is None:
        return ""
    return str(x)

def _tokenize(s: str):
    return re.findall(r"[a-zA-Z]+", (s or "").lower())

def _contains_any(s: str, words):
    t = set(_tokenize(s))
    return any(w in t for w in words)

def _count_bullets(s: str):
    return sum(1 for line in (s or "").splitlines()
               if re.match(r"^\s*(\d+[\).\s-]|[-*])", line))

def keywords_from_question(q: str):
    toks = _tokenize(q or "")
    stop = {"what","are","is","how","the","and","a","an","to","of","in","do","does","they","it",
            "for","on","with","by","explain","tell","me","about"}
    return [t for t in toks if t not in stop]

# ---------- Heuristic metrics (domain-aware) ----------
def heuristic_plan_quality(plan: str, question: str) -> float:
    bullets = _count_bullets(plan)
    bullets_score = max(0.0, 1.0 - abs(bullets - 4) / 4.0) if bullets > 0 else 0.0
    kws = set(keywords_from_question(question))
    cov = 0.0
    if kws:
        cov = sum(1 for w in kws if _contains_any(plan, {w})) / len(kws)
    return round(0.7*bullets_score + 0.3*cov, 3)

def heuristic_draft_helpfulness(draft: str, question: str) -> float:
    kws = set(keywords_from_question(question))
    cov = 0.0
    if kws:
        cov = sum(1 for w in kws if _contains_any(draft, {w})) / len(kws)
    tips = sum(1 for line in draft.splitlines() if re.match(r"^\s*\d+\s*[).-]", line))
    tips_score = min(1.0, tips/3.0)
    length = len(_tokenize(draft))
    length_score = max(0.0, min(1.0, (length - 80) / 220))  # ~80–300 words sweet spot
    return round(0.5*cov + 0.3*tips_score + 0.2*length_score, 3)

def heuristic_final_clarity(final: str) -> float:
    summary_bonus = 0.2 if re.search(r"\bsummary\b", (final or "").lower()) else 0.0
    paras = [p for p in (final or "").split("\n\n") if p.strip()]
    para_score = min(0.4, 0.2*len(paras))  # reward up to ~2 paragraphs
    sentences = re.split(r"[.!?]+", final or "")
    words = len(_tokenize(final))
    sent_count = max(1, len([s for s in sentences if s.strip()]))
    len_score = 0.4 * max(0.0, 1.0 - abs((words/sent_count) - 18) / 18)
    return round(summary_bonus + para_score + len_score, 3)

def heuristic_alignment(draft: str, final: str) -> float:
    # simple overlap on content words from both texts
    d = set(_tokenize(draft)); f = set(_tokenize(final))
    if not d and not f:
        return 0.5
    jacc = len(d & f) / max(1, len(d | f))
    return round(0.4 + 0.6*jacc, 3)  # 0.4 base + overlap bonus

# ---------- LLM (GEval) run ----------
def try_llm_scores(question: str, plan: str, draft: str, final: str):
    judge = make_judge()
    metrics = build_metrics(judge)
    if not metrics:
        return None
    m1, m2, m3, m4 = metrics
    try:
        s1 = m1.measure(LLMTestCase(input=question or "plan",  actual_output=plan)).score
        s2 = m2.measure(LLMTestCase(input=question or "draft", actual_output=draft)).score
        s3 = m3.measure(LLMTestCase(input=question or "final", actual_output=final)).score
        s4 = m4.measure(LLMTestCase(context=draft, actual_output=final)).score
        return [s1, s2, s3, s4]
    except Exception:
        return None

# ---------- Main ----------
if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Evaluate Kafka agents with GEval; fallback to domain-aware heuristics")
    ap.add_argument("--cid", required=True, help="correlation_id to evaluate")
    ap.add_argument("--bootstrap", default=BOOTSTRAP, help="Kafka bootstrap servers")
    args = ap.parse_args()

    BOOTSTRAP = args.bootstrap
    print(f"\n[evaluator] correlation_id: {args.cid}")
    print("[evaluator] reading from topics: tasks, drafts, final ...")

    try:
        plan_msg  = read_one("tasks",  args.cid)
        draft_msg = read_one("drafts", args.cid)
        final_msg = read_one("final",  args.cid)
    except TimeoutError as e:
        print(f"[evaluator] Error: {e}")
        print("[evaluator] Ensure all agents published messages with the same correlation_id.")
        raise SystemExit(1)

    # Extract question (from any stage)
    question = (plan_msg.get("question") or draft_msg.get("question") or final_msg.get("question") or "").strip()

    # Prefer 'content' (string) then fall back to structured fields
    plan  = to_text(plan_msg.get("content") or plan_msg.get("plan"))
    draft = to_text(draft_msg.get("content") or draft_msg.get("draft"))
    final = to_text(final_msg.get("content") or final_msg.get("final") or final_msg.get("answer"))

   

    # Try LLM (GEval) first; if not available, domain-aware heuristics
    scores = try_llm_scores(question, plan, draft, final) if HAS_DEEPEVAL else None
    used_llm = scores is not None

    if not used_llm:
        s1 = heuristic_plan_quality(plan, question)
        s2 = heuristic_draft_helpfulness(draft, question)
        s3 = heuristic_final_clarity(final)
        s4 = heuristic_alignment(draft, final)
        scores = [s1, s2, s3, s4]

    print("\n=== GEval Scores (0–1) ===" if used_llm else "\n=== GEval Scores ===")
    labels = ["Plan Quality", "Draft Helpfulness", "Final Clarity", "Final vs Draft Alignment"]
    for lbl, sc in zip(labels, scores):
        try:
            print(f"{lbl}: {float(sc):.3f}")
        except Exception:
            print(f"{lbl}: {sc}")
