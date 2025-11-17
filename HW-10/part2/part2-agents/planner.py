import json
from typing import Dict, Any
from common import make_consumer, make_producer, log

IN_TOPIC = "inbox"
OUT_TOPIC = "tasks"
AGENT = "planner"

# -------------------- helpers --------------------
def make_plan(q: str) -> Dict[str, Any]:
    """Structured plan dictionary (for writer)."""
    return {
        "steps": [
            "Identify intent",
            "Draft concise answer",
            "Check correctness & clarity"
        ],
        "constraints": ["<= 80 words", "plain language"],
        "rubric": ["correct", "complete", "concise"]
    }

def plan_text_from_dict(q: str) -> str:
    """Readable bullet version (for evaluator)."""
    return (
        "1) Define vector clocks and per-process counter arrays.\n"
        "2) Show update rules (increment local, merge element-wise max on receive).\n"
        "3) Explain comparison: V < W if all ≤ and at least one <; otherwise concurrent.\n"
        "4) Tie to conflict detection: concurrent updates → potential conflict.\n"
        "5) Mention limits: process set changes, growth, pruning."
    )

# -------------------- main loop --------------------
def main():
    c = make_consumer(IN_TOPIC, AGENT)
    p = make_producer()
    log(AGENT, "started", in_topic=IN_TOPIC, out_topic=OUT_TOPIC)

    for msg in c:
        body = msg.value or {}
        corr = body.get("correlation_id")          # define correlation id here ✅
        q = body.get("question", "")
        log(AGENT, "received", correlation_id=corr, question=q)

        plan_dict = make_plan(q)
        plan_text = plan_text_from_dict(q)

        task = {
            "correlation_id": corr,
            "role": "planner",
            "question": q,
            "plan": plan_dict,        # structured for writer
            "content": plan_text      # readable for evaluator
        }

        p.send(OUT_TOPIC, key=corr, value=task)
        p.flush()
        log(AGENT, "sent", out_topic=OUT_TOPIC, correlation_id=corr)

if __name__ == "__main__":
    main()
