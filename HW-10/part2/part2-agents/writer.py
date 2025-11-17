import os
from typing import Dict, Any
from common import make_consumer, make_producer, log
from langchain_ollama import ChatOllama
from langchain.schema import HumanMessage, SystemMessage

IN_TOPIC="tasks"; OUT_TOPIC="drafts"; AGENT="writer"
OLLAMA_URL=os.getenv("OLLAMA_BASE_URL","http://localhost:11434")
OLLAMA_MODEL=os.getenv("OLLAMA_MODEL","phi3:mini")

def llm_answer(question: str, plan: Dict[str,Any]) -> str:
    try:
        llm = ChatOllama(base_url=OLLAMA_URL, model=OLLAMA_MODEL, temperature=0.0)
        sys = SystemMessage(content="You are a helpful technical writer. ≤80 words. Be correct and clear.")
        user = HumanMessage(content=f"Question: {question}\nPlan: {plan}")
        return llm.invoke([sys, user]).content.strip()
    except Exception:
        return f"(fallback) Short answer to: {question}"

def main():
    c = make_consumer(IN_TOPIC, AGENT); p = make_producer()
    log(AGENT,"started",in_topic=IN_TOPIC,out_topic=OUT_TOPIC,model=OLLAMA_MODEL)
    for msg in c:
        body = msg.value or {}; corr = body.get("correlation_id"); q = body.get("question",""); plan = body.get("plan",{})
        log(AGENT,"received",correlation_id=corr,question=q)
        draft = llm_answer(q, plan)
        p.send(OUT_TOPIC, key=corr, value={
    "correlation_id": corr,
    "role": "writer",
    "question": q,
    "plan": plan,
    "draft": draft,
    "content": draft
})

        log(AGENT,"sent",out_topic=OUT_TOPIC,correlation_id=corr,draft_preview=draft[:80])
if __name__ == "__main__": main()
