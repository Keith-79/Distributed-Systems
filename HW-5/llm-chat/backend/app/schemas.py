from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ChatIn(BaseModel):
    user_id: Optional[int] = None
    message: str
    conversation_id: Optional[int] = None
    title: Optional[str] = None

class ChatOut(BaseModel):
    conversation_id: int
    reply: str

class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime
    class Config:
        from_attributes = True

class ConversationOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    title: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class MessagesOut(BaseModel):
    conversation_id: int
    messages: List[ChatMessageOut]
    class Config:
        from_attributes = True
