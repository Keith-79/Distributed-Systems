import os
from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from .. import models
from ..schemas import ChatIn, ChatOut, ConversationOut, MessagesOut, ChatMessageOut

router = APIRouter(prefix="/ai", tags=["ai"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")

async def _ollama_chat(messages: List[dict]) -> str:
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {"model": OLLAMA_MODEL, "messages": messages, "stream": False}
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data["message"]["content"]
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {str(e)}")

@router.post("/chat", response_model=ChatOut)
async def chat(body: ChatIn, db: Session = Depends(get_db)):
    
    convo = None
    if body.conversation_id:
        convo = db.get(models.Conversation, body.conversation_id)
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = (body.title or body.message.strip()[:80] or "New chat")
        convo = models.Conversation(user_id=body.user_id, title=title)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    user_msg = models.Message(conversation_id=convo.id, role="user", content=body.message.strip())
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    stmt = (
        select(models.Message)
        .where(models.Message.conversation_id == convo.id)
        .order_by(models.Message.created_at.asc())
    )
    history = db.execute(stmt).scalars().all()
    chat_history = [{"role": m.role, "content": m.content} for m in history]

    reply_text = await _ollama_chat(chat_history)

    bot_msg = models.Message(conversation_id=convo.id, role="assistant", content=reply_text)
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)

    return ChatOut(conversation_id=convo.id, reply=reply_text)

@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(user_id: int | None = None, db: Session = Depends(get_db)):
    stmt = select(models.Conversation).order_by(models.Conversation.updated_at.desc())
    if user_id is not None:
        stmt = stmt.where(models.Conversation.user_id == user_id)
    return db.execute(stmt).scalars().all()

@router.get("/messages/{conversation_id}", response_model=MessagesOut)
def list_messages(conversation_id: int, db: Session = Depends(get_db)):
    convo = db.get(models.Conversation, conversation_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    stmt = (
        select(models.Message)
        .where(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.created_at.asc())
    )
    msgs = db.execute(stmt).scalars().all()
    return MessagesOut(conversation_id=conversation_id, messages=msgs)
