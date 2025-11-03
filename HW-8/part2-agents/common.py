import json, os, time, uuid
from typing import Any
from kafka import KafkaProducer, KafkaConsumer
from dotenv import load_dotenv
load_dotenv()

BOOT = os.getenv("KAFKA_BOOTSTRAP", "localhost:9092")
GROUP_PREFIX = os.getenv("GROUP_PREFIX", "hw8p2")

def make_producer():
    return KafkaProducer(
        bootstrap_servers=BOOT,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda v: (v or "").encode("utf-8"),
        acks="all",
        linger_ms=50,
    )

def make_consumer(topic: str, group: str):
    # unique group each run to ensure we read existing messages
    fresh_group = f"{GROUP_PREFIX}.{group}.{uuid.uuid4().hex[:6]}"
    return KafkaConsumer(
        topic,
        bootstrap_servers=BOOT,
        group_id=fresh_group,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        key_deserializer=lambda b: b.decode("utf-8") if b else None,
        enable_auto_commit=True,
        auto_offset_reset="earliest",
    )


def now_ms() -> int: return int(time.time()*1000)
def new_correlation_id() -> str: return uuid.uuid4().hex
def log(agent: str, msg: str, **extra: Any):
    print(json.dumps({"t": now_ms(), "agent": agent, "msg": msg, **extra}, ensure_ascii=False))
