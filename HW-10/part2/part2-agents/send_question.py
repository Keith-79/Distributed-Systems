import sys
from common import make_producer, log, new_correlation_id
AGENT="sender"; OUT_TOPIC="inbox"
def main():
    q = "What are vector clocks and how do they detect conflicts?"
    if len(sys.argv)>1: q = " ".join(sys.argv[1:])
    corr = new_correlation_id()
    p = make_producer()
    p.send(OUT_TOPIC, key=corr, value={"correlation_id": corr, "question": q}); p.flush()
    log(AGENT,"sent",out_topic=OUT_TOPIC,correlation_id=corr,question=q)
if __name__ == "__main__": main()
