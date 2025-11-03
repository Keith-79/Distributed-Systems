from typing import Dict, Any
from common import make_consumer, make_producer, log

IN_TOPIC = "inbox"
OUT_TOPIC = "tasks"
AGENT = "planner"

def make_plan(q: str) -> Dict[str, Any]:
    return {
        "steps": ["Identify intent", "Draft concise answer", "Check correctness & clarity"],
        "constraints": ["<= 80 words", "plain language"],
        "rubric": ["correct", "complete", "concise"]
    }

def main():
    c = make_consumer(IN_TOPIC, AGENT)
    p = make_producer()
    log(AGENT, "started", in_topic=IN_TOPIC, out_topic=OUT_TOPIC)
    for msg in c:
        body = msg.value or {}
        corr = body.get("correlation_id")
        q = body.get("question","")
        log(AGENT, "received", correlation_id=corr, question=q)
        task = {"correlation_id": corr, "question": q, "plan": make_plan(q)}
        p.send(OUT_TOPIC, key=corr, value=task); p.flush()
        log(AGENT, "sent", out_topic=OUT_TOPIC, correlation_id=corr)
if __name__ == "__main__": main()
