from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class AuthorBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str  = Field(..., min_length=1, max_length=100)
    email: EmailStr

class AuthorCreate(AuthorBase): pass
class AuthorUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name:  Optional[str] = Field(None, min_length=1, max_length=100)
    email:      Optional[EmailStr] = None

class AuthorOut(AuthorBase):
    id: int
    class Config: from_attributes = True

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    isbn:  str = Field(..., min_length=5, max_length=20)
    publication_year: Optional[int] = Field(None, ge=0, le=2100)
    available_copies: Optional[int] = Field(1, ge=0)
    author_id: int = Field(..., ge=1)

class BookCreate(BookBase): pass
class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    isbn:  Optional[str] = Field(None, min_length=5, max_length=20)
    publication_year: Optional[int] = Field(None, ge=0, le=2100)
    available_copies: Optional[int] = Field(None, ge=0)
    author_id: Optional[int] = Field(None, ge=1)

class BookOut(BookBase):
    id: int
    class Config: from_attributes = True

class ConversationOut(BaseModel):
    id: int
    title: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
    class Config: from_attributes = True

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[int] = Field(None, ge=1)

class ChatResponse(BaseModel):
    conversation_id: int
    reply: str

class BooksMeta(BaseModel):
    limit: int
    offset: int
    total: int

class BooksPage(BaseModel):
    data: List[BookOut]      
    meta: BooksMeta

    class Config:
        from_attributes = True 