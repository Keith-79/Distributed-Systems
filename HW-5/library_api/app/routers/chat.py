# library_api/app/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..deps import get_db
from .. import models, schemas

router = APIRouter()

@router.get("/conversations", response_model=list[schemas.ConversationOut])
def list_conversations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = select(models.Conversation).order_by(models.Conversation.id.desc()).limit(limit).offset(offset)
    return db.execute(q).scalars().all()

@router.get("/messages/{conversation_id}", response_model=list[schemas.MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Conversation, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    q = select(models.Message).where(models.Message.conversation_id == conversation_id).order_by(models.Message.id.asc())
    return db.execute(q).scalars().all()

class SendMessageIn(BaseModel):
    conversation_id: int
    content: str

@router.post("/messages", response_model=schemas.MessageOut, status_code=status.HTTP_201_CREATED)
def send_message(payload: SendMessageIn, db: Session = Depends(get_db)):
    if not db.get(models.Conversation, payload.conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    msg = models.Message(conversation_id=payload.conversation_id, role="user", content=payload.content)
    db.add(msg); db.commit(); db.refresh(msg)
    return msg
