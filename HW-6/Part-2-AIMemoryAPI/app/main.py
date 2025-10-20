from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()

import os
from datetime import datetime, timezone
from typing import Optional, Literal, List, Dict

import httpx
import numpy as np
from fastapi import FastAPI, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi.middleware.cors import CORSMiddleware

# ---------------- Settings ----------------
class Settings(BaseModel):
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "hw6")
    SHORT_TERM_N: int = int(os.getenv("SHORT_TERM_N", 8))
    SUMMARIZE_EVERY_USER_MSGS: int = int(os.getenv("SUMMARIZE_EVERY_USER_MSGS", 4))
    EPISODES_TOP_K: int = int(os.getenv("EPISODES_TOP_K", 5))
    CHAT_MODEL: str = os.getenv("CHAT_MODEL", "phi3:mini")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "nomic-embed-text")

def get_settings() -> Settings:
    return Settings()

# ---------------- App & DB ----------------
app = FastAPI(title="HW6 Part 2: Health & Wellness Coach (FastAPI + MongoDB + Ollama)")

origins = [
    "http://127.0.0.1:5173", "http://localhost:5173",
    "http://127.0.0.1:5500", "http://localhost:5500",
    "http://127.0.0.1:8000", "http://localhost:8000",
    "http://127.0.0.1", "http://localhost", "*",  # dev-only
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None

def get_db() -> AsyncIOMotorDatabase:
    assert _db is not None, "Database is not initialized yet."
    return _db

@app.on_event("startup")
async def on_startup():
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.DB_NAME]

    messages = _db.get_collection("messages")
    summaries = _db.get_collection("summaries")
    episodes  = _db.get_collection("episodes")

    await messages.create_index([("user_id", 1), ("session_id", 1), ("created_at", -1)])
    await messages.create_index([("session_id", 1), ("created_at", -1)])
    await summaries.create_index([("user_id", 1), ("scope", 1), ("session_id", 1), ("created_at", -1)])
    await episodes.create_index([("user_id", 1), ("created_at", -1)])

@app.on_event("shutdown")
async def on_shutdown():
    global _client
    if _client:
        _client.close()

# ---------------- Documents ----------------
class MessageDoc(BaseModel):
    user_id: str
    session_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SummaryDoc(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    scope: Literal["session", "user"]
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EpisodeDoc(BaseModel):
    user_id: str
    session_id: str
    fact: str
    importance: float = Field(ge=0.0, le=1.0)
    embedding: List[float]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ---------------- IO Schemas ----------------
class ChatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str

class ChatResponse(BaseModel):
    reply: str
    used: Dict

# ---------------- Ollama helpers ----------------
async def ollama_chat(model: str, system_prompt: str, user_prompt: str, options: dict | None = None) -> str:
    url = "http://localhost:11434/api/chat"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
    }
    if options:
        payload["options"] = options
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "") or ""

async def ollama_embed(model: str, text: str) -> List[float]:
    url = "http://localhost:11434/api/embeddings"
    payload = {"model": model, "prompt": text}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        emb = data.get("embedding")
        if not isinstance(emb, list):
            raise ValueError("Invalid embedding from Ollama")
        return [float(x) for x in emb]

# ---------------- DB helpers ----------------
async def save_message(db: AsyncIOMotorDatabase, doc: MessageDoc) -> str:
    res = await db["messages"].insert_one(doc.model_dump())
    return str(res.inserted_id)

async def fetch_short_term(db: AsyncIOMotorDatabase, user_id: str, session_id: str, n: int) -> List[MessageDoc]:
    cur = db["messages"].find({"user_id": user_id, "session_id": session_id}).sort("created_at", -1).limit(n)
    items = [MessageDoc(**x) async for x in cur]
    return list(reversed(items))

async def fetch_latest_summaries(db: AsyncIOMotorDatabase, user_id: str, session_id: str) -> Dict:
    summaries = db["summaries"]
    sess = await summaries.find_one({"user_id": user_id, "scope": "session", "session_id": session_id}, sort=[("created_at", -1)])
    life = await summaries.find_one({"user_id": user_id, "scope": "user", "session_id": None}, sort=[("created_at", -1)])
    return {
        "session": SummaryDoc(**sess).text if sess else None,
        "lifetime": SummaryDoc(**life).text if life else None
    }

async def count_user_msgs_in_session(db: AsyncIOMotorDatabase, user_id: str, session_id: str) -> int:
    return await db["messages"].count_documents({"user_id": user_id, "session_id": session_id, "role": "user"})

# ---------------- Episodic memory ----------------
EPISODE_SYS = (
    "You are extracting wellness-related facts/preferences from ONE user message. "
    "Return 0-3 bullets in the format: '- <fact> (importance: 0.xx)'. "
    "Focus on routines, goals, constraints, symptoms, schedule, gear, or environment. "
    "Keep each under 120 chars. No extra commentary."
)

async def extract_episodes(settings: Settings, text: str) -> List[tuple[str, float]]:
    try:
        content = await ollama_chat(
            settings.CHAT_MODEL,
            EPISODE_SYS,
            f"Message: {text}\nReturn 0-3 bullets."
        )
        facts: List[tuple[str, float]] = []
        for raw in content.splitlines():
            line = raw.strip(" -*")
            if not line:
                continue
            fact = line
            score = 0.5
            if "importance:" in line:
                try:
                    after = line.split("importance:", 1)[1]
                    num = after.split(")", 1)[0]
                    score = float(num.strip())
                    fact = line.split("(importance:", 1)[0].strip()
                except Exception:
                    pass
            facts.append((fact[:800], max(0.0, min(1.0, score))))
        return facts[:3]
    except Exception:
        # conservative fallback
        return [(text[:800], 0.3)]

async def store_episodes(db: AsyncIOMotorDatabase, user_id: str, session_id: str, facts: List[tuple[str, float]], emb_model: str):
    if not facts:
        return
    col = db["episodes"]
    for fact, imp in facts:
        try:
            emb = await ollama_embed(emb_model, fact)
        except Exception:
            emb = []
        doc = EpisodeDoc(user_id=user_id, session_id=session_id, fact=fact, importance=float(imp), embedding=emb)
        await col.insert_one(doc.model_dump())

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return -1.0
    na = np.linalg.norm(a)
    nb = np.linalg.norm(b)
    if na == 0 or nb == 0:
        return -1.0
    return float(a.dot(b) / (na * nb))

async def retrieve_topk_episodes(db: AsyncIOMotorDatabase, user_id: str, query_text: str, emb_model: str, k: int) -> List[Dict]:
    try:
        q_emb = np.array(await ollama_embed(emb_model, query_text), dtype=np.float32)
    except Exception:
        q_emb = np.array([], dtype=np.float32)
    cur = db["episodes"].find({"user_id": user_id}).sort("created_at", -1).limit(300)
    items = [x async for x in cur]
    scored = []
    for x in items:
        e = np.array(x.get("embedding", []), dtype=np.float32)
        sim = _cosine(q_emb, e)
        sim = sim * 0.85 + float(x.get("importance", 0.0)) * 0.15
        scored.append((sim, x))
    scored.sort(key=lambda t: t[0], reverse=True)
    return [{
        "fact": s[1]["fact"],
        "importance": s[1].get("importance", 0.0),
        "score": round(float(s[0]), 4)
    } for s in scored[:k]]

# ---------------- Strict Short Summaries ----------------
SESSION_SUM_SYS = (
    "You are summarizing a WELLNESS chat.\n"
    "Rules:\n"
    "- Output EXACTLY 4 bullets.\n"
    "- Each bullet ≤16 words.\n"
    "- Use only explicit facts from USER messages.\n"
    "- No diagnoses, medications, or disclaimers.\n"
    "- No numbering; start each line with '- '.\n"
)


LIFETIME_SUM_SYS = (
    "Condense WELLNESS session summaries.\n"
    "Rules:\n"
    "- Output EXACTLY 5 bullets.\n"
    "- Each bullet ≤16 words.\n"
    "- Only include information from the provided summaries.\n"
    "- Non-clinical; no diagnosis or medications.\n"
    "- No numbering; start each line with '- '.\n"
)

def _truncate_words(s: str, n: int) -> str:
    w = s.strip().split()
    return " ".join(w[:n]) if len(w) > n else " ".join(w)

def _extract_bullets(raw: str) -> list[str]:
    # Accept typical bullet formats or split a paragraph into pseudo-bullets
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    if len(lines) <= 1 and " - " in raw:
        lines = [p.strip() for p in raw.split(" - ") if p.strip()]
    bullets: list[str] = []
    for ln in lines:
        # strip common bullet prefixes
        if ln.startswith(("- ", "* ", "• ")):
            ln = ln[2:].strip()
        # remove leading numbering (e.g., "1. ", "1) ")
        i = 0
        while i < len(ln) and (ln[i].isdigit() or ln[i] in ".):- "):
            i += 1
        cleaned = ln[i:].strip()
        if cleaned:
            bullets.append(cleaned)
    # Fallback: split on periods if nothing usable
    if not bullets:
        bullets = [s.strip() for s in raw.replace("\n", " ").split(".") if s.strip()]
    # Deduplicate
    seen, uniq = set(), []
    for b in bullets:
        key = b.lower()
        if key not in seen:
            seen.add(key)
            uniq.append(b)
    return uniq

# add near your other imports
import re

# keep these (or add them if missing)
_DISCLAIMER_PAT = re.compile(r"\([^)]*Consider seeing a licensed professional[^)]*\)", re.IGNORECASE)
_IMPORTANCE_PAT = re.compile(r"\([^)]*importance[^)]*\)", re.IGNORECASE)

def _sanitize_line(s: str) -> str:
    # Remove disclaimers and "importance" notes, but KEEP numbers and times like 7:30 AM
    s = _DISCLAIMER_PAT.sub("", s)
    s = _IMPORTANCE_PAT.sub("", s)
    # Do NOT strip generic parentheses or numbers; just tidy punctuation/whitespace
    s = s.replace("“", "").replace("”", "").replace('"', "")
    s = re.sub(r"\s+", " ", s).strip(" -;,:.\t")
    return s

def _normalize_summary(raw: str, n: int, max_words: int) -> str:
    bs = _extract_bullets(raw)
    if not bs:
        # Fallback: split sentences, but DO NOT split on colon (protects 7:30 AM)
        bs = [s.strip() for s in raw.replace("\n", " ").split(".") if s.strip()]

    cleaned = []
    for b in bs:
        # Only split on period/semicolon to avoid breaking times like "7:30 AM"
        b = re.split(r"[.;]\s", b, maxsplit=1)[0]
        b = _sanitize_line(b)
        b = _truncate_words(b, max_words)
        if b:
            cleaned.append(b)

    if len(cleaned) > n:
        cleaned = cleaned[:n]
    while len(cleaned) < n:
        cleaned.append("No further details provided")

    return "\n".join(f"- {b}" for b in cleaned[:n])


async def make_session_summary(settings: Settings, messages: List[MessageDoc]) -> str:
    # Use only USER messages to avoid echoing assistant advice/disclaimers
    user_msgs = [m for m in messages[-20:] if m.role == "user"]
    convo = [f"USER: {m.content}" for m in user_msgs] if user_msgs else [f"USER: {messages[-1].content}"] if messages else []
    user_prompt = "\n".join(convo)

    try:
        raw = await ollama_chat(
            settings.CHAT_MODEL,
            SESSION_SUM_SYS,
            user_prompt,
            options={"num_predict": 160, "temperature": 0.1, "top_p": 0.9}
        )
    except Exception:
        raw = f"- Conversation focus: {messages[-1].content[:120] if messages else 'N/A'}"

    return _normalize_summary(raw, n=4, max_words=16)


async def upsert_session_summary(db: AsyncIOMotorDatabase, user_id: str, session_id: str, text: str):
    await db["summaries"].insert_one(
        SummaryDoc(user_id=user_id, session_id=session_id, scope="session", text=text).model_dump()
    )

async def refresh_lifetime_summary(db: AsyncIOMotorDatabase, settings: Settings, user_id: str):
    cur = db["summaries"].find({"user_id": user_id, "scope": "session"}).sort("created_at", -1).limit(12)
    sess_summaries = [x.get("text", "") async for x in cur]
    if not sess_summaries:
        return
    joined = "\n".join(sess_summaries)
    try:
        raw = await ollama_chat(
            settings.CHAT_MODEL,
            LIFETIME_SUM_SYS,
            joined,
            options={"num_predict": 220, "temperature": 0.2, "top_p": 0.9}
        )
    except Exception:
        raw = "\n".join(sess_summaries[:5])
    text = _normalize_summary(raw, n=5, max_words=16)
    await db["summaries"].update_one(
        {"user_id": user_id, "scope": "user", "session_id": None},
        {"$set": SummaryDoc(user_id=user_id, session_id=None, scope="user", text=text).model_dump()},
        upsert=True,
    )

# ---------------- Prompt assembly ----------------
BASE_SYS = (
  "You are a Health & Wellness Coach. Practical, safe, non-clinical."
  " Reply in 3–5 concise bullets (≤18 words each)."
  " Do NOT include the word 'importance' or any scores."
  " Do NOT repeat or quote the user message."
  " If advice could be risky, add: 'Consider seeing a licensed professional.'"
  " Never diagnose conditions or mention medications."
)

def build_chat_user_prompt(
    lifetime: Optional[str],
    session: Optional[str],
    short_msgs: List[MessageDoc],
    episodic_line: str,
    current_user_msg: str
) -> str:
    parts: List[str] = []
    if lifetime:
        parts.append(f"LIFETIME WELLNESS PROFILE:\n{lifetime}")
    if session:
        parts.append(f"RECENT SESSION NOTES:\n{session}")
    if short_msgs:
        short = "\n".join([f"{m.role[:1].upper()}: {m.content}" for m in short_msgs])
        parts.append(f"SHORT-TERM CONTEXT:\n{short}")
    if episodic_line:
        parts.append(f"EPISODIC HINTS: {episodic_line}")
    parts.append(f"USER GOAL/QUESTION: {current_user_msg}")
    parts.append("RESPOND WITH: 3–6 concise bullets or a 4-step plan.")
    return "\n\n".join(parts)

# ---------------- Endpoints ----------------
@app.get("/health")
async def health(db: AsyncIOMotorDatabase = Depends(get_db)):
    cols = await db.list_collection_names()
    return {"ok": True, "collections": cols}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    settings = get_settings()
    session_id = req.session_id or "default"

    # store user message
    await save_message(db, MessageDoc(user_id=req.user_id, session_id=session_id, role="user", content=req.message))

    # context + summaries
    short_msgs = await fetch_short_term(db, req.user_id, session_id, settings.SHORT_TERM_N)
    sums = await fetch_latest_summaries(db, req.user_id, session_id)

    # episodic memory
    facts = await extract_episodes(settings, req.message)
    await store_episodes(db, req.user_id, session_id, facts, settings.EMBED_MODEL)
    topk = await retrieve_topk_episodes(db, req.user_id, req.message, settings.EMBED_MODEL, settings.EPISODES_TOP_K)

    # dedupe
    seen, uniq = set(), []
    for e in topk:
        k = e["fact"].strip().lower()
        if k not in seen:
            seen.add(k)
            uniq.append(e)
    topk = uniq

    def _clean_fact(s: str) -> str:
        t = s.replace("importance:", "").replace("( )", "").strip()
        t = t.replace("exernercises", "exercises")  # tiny typo fix
        return t

    episodic_line = "; ".join(_clean_fact(e["fact"]) for e in topk)

    # assemble + call LLM
    user_prompt = build_chat_user_prompt(
        sums.get("lifetime"), sums.get("session"), short_msgs, episodic_line, req.message
    )
    try:
        reply = await ollama_chat(settings.CHAT_MODEL, BASE_SYS, user_prompt)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")

    # store assistant reply
    await save_message(db, MessageDoc(user_id=req.user_id, session_id=session_id, role="assistant", content=reply))

    # periodic summaries
    cnt = await count_user_msgs_in_session(db, req.user_id, session_id)
    if settings.SUMMARIZE_EVERY_USER_MSGS > 0 and cnt % settings.SUMMARIZE_EVERY_USER_MSGS == 0:
        recent = await fetch_short_term(db, req.user_id, session_id, max(settings.SHORT_TERM_N, 16))
        stext = await make_session_summary(settings, recent)
        await upsert_session_summary(db, req.user_id, session_id, stext)
        if cnt % (settings.SUMMARIZE_EVERY_USER_MSGS * 2) == 0:
            await refresh_lifetime_summary(db, settings, req.user_id)

    used = {
        "short_term_count": len(short_msgs),
        "long_term_session": sums.get("session"),
        "long_term_lifetime": sums.get("lifetime"),
        "episodic_topk": topk,
    }
    return ChatResponse(reply=reply, used=used)

@app.post("/api/debug/force_summarize/{user_id}")
async def force_summarize(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    settings = get_settings()
    session_id = "default"
    recent = await fetch_short_term(db, user_id, session_id, max(settings.SHORT_TERM_N, 16))
    if not recent:
        return {"ok": False, "reason": "no messages"}
    stext = await make_session_summary(settings, recent)
    await upsert_session_summary(db, user_id, session_id, stext)
    return {"ok": True, "session_summary": stext}

@app.post("/api/debug/force_lifetime/{user_id}")
async def force_lifetime(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    settings = get_settings()
    await refresh_lifetime_summary(db, settings, user_id)
    doc = await db["summaries"].find_one({"user_id": user_id, "scope": "user"}, sort=[("created_at", -1)])
    return {"ok": True, "lifetime_summary": (doc or {}).get("text")}

@app.get("/api/memory/{user_id}")
async def get_memory(user_id: str = Path(...), db: AsyncIOMotorDatabase = Depends(get_db)):
    session_id = "default"
    msgs_cur = db["messages"].find({"user_id": user_id, "session_id": session_id}).sort("created_at", -1).limit(16)
    msgs = [{"role": m["role"], "content": m["content"], "created_at": m["created_at"]} async for m in msgs_cur]
    msgs.reverse()
    sess = await db["summaries"].find_one({"user_id": user_id, "scope": "session", "session_id": session_id}, sort=[("created_at", -1)])
    life = await db["summaries"].find_one({"user_id": user_id, "scope": "user", "session_id": None}, sort=[("created_at", -1)])
    epi_cur = db["episodes"].find({"user_id": user_id}).sort("created_at", -1).limit(20)
    epis = [{"fact": e.get("fact"), "importance": e.get("importance", 0.0), "created_at": e.get("created_at")} async for e in epi_cur]
    return {
        "messages": msgs,
        "session_summary": (sess or {}).get("text"),
        "lifetime_summary": (life or {}).get("text"),
        "episodes": epis
    }

@app.get("/api/aggregate/{user_id}")
async def get_aggregate(user_id: str = Path(...), db: AsyncIOMotorDatabase = Depends(get_db)):
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    daily = [{"date": d["_id"], "count": d["count"]} async for d in db["messages"].aggregate(pipeline)]
    life = await db["summaries"].find_one({"user_id": user_id, "scope": "user", "session_id": None}, sort=[("created_at", -1)])
    sess = await db["summaries"].find_one({"user_id": user_id, "scope": "session"}, sort=[("created_at", -1)])
    recents = []
    if life:
        recents.append({"scope": "user", "text": life.get("text"), "created_at": life.get("created_at")})
    if sess:
        recents.append({"scope": "session", "text": sess.get("text"), "created_at": sess.get("created_at"), "session_id": sess.get("session_id")})
    return {"daily_counts": daily, "recent_summaries": recents}
