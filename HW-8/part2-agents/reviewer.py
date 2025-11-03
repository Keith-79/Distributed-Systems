import re
from common import make_consumer, make_producer, log

IN_TOPIC="drafts"; OUT_TOPIC="final"; AGENT="reviewer"

def review(draft: str):
    ok_len = len(draft.split()) <= 80
    has_todo = bool(re.search(r"\bTODO\b", draft, re.I))
    if ok_len and not has_todo:
        return "approved", "meets rubric"
    reasons=[]
    if not ok_len: reasons.append("too long")
    if has_todo: reasons.append("contains TODO")
    return "rejected", "; ".join(reasons)

def main():
    c = make_consumer(IN_TOPIC, AGENT); p = make_producer()
    log(AGENT,"started",in_topic=IN_TOPIC,out_topic=OUT_TOPIC)
    for msg in c:
        body = msg.value or {}; corr = body.get("correlation_id"); q = body.get("question",""); draft = body.get("draft","")
        log(AGENT,"received",correlation_id=corr,draft_preview=draft[:80])
        status, notes = review(draft)
        p.send(OUT_TOPIC, key=corr, value={"correlation_id":corr,"question":q,"answer":draft,"status":status,"review_notes":notes}); p.flush()
        log(AGENT,"sent",out_topic=OUT_TOPIC,correlation_id=corr,status=status)
if __name__ == "__main__": main()
