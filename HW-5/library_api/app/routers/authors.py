from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..database import get_db
from .. import models
from ..schemas import AuthorCreate, AuthorOut, AuthorUpdate, BookOut

router = APIRouter(prefix="/authors", tags=["authors"])

def _get_author_or_404(db: Session, author_id: int) -> models.Author:
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return author

@router.post("", response_model=AuthorOut, status_code=status.HTTP_201_CREATED)
def create_author(payload: AuthorCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(models.Author).where(func.lower(models.Author.email) == func.lower(payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    author = models.Author(first_name=payload.first_name.strip(), last_name=payload.last_name.strip(), email=payload.email.strip())
    db.add(author); db.commit(); db.refresh(author); return author

@router.get("", response_model=List[AuthorOut])
def list_authors(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="optional search in first/last name"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    stmt = select(models.Author)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(func.concat(models.Author.first_name, " ", models.Author.last_name).ilike(like))
    stmt = stmt.order_by(models.Author.last_name.asc(), models.Author.first_name.asc()).limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()

@router.get("/{author_id}", response_model=AuthorOut)
def get_author(author_id: int, db: Session = Depends(get_db)):
    return _get_author_or_404(db, author_id)

@router.put("/{author_id}", response_model=AuthorOut)
def update_author(author_id: int, payload: AuthorUpdate, db: Session = Depends(get_db)):
    author = _get_author_or_404(db, author_id)
    if payload.email and payload.email.strip().lower() != author.email.lower():
        conflict = db.execute(select(models.Author).where(func.lower(models.Author.email) == func.lower(payload.email))).scalar_one_or_none()
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        author.email = payload.email.strip()
    if payload.first_name is not None: author.first_name = payload.first_name.strip()
    if payload.last_name  is not None: author.last_name  = payload.last_name.strip()
    db.add(author); db.commit(); db.refresh(author); return author

@router.delete("/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_author(author_id: int, db: Session = Depends(get_db)):
    author = _get_author_or_404(db, author_id)
    book_count = db.execute(select(func.count()).select_from(models.Book).where(models.Book.author_id == author.id)).scalar_one()
    if book_count > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot delete author with existing books")
    db.delete(author); db.commit(); return None

@router.get("/{author_id}/books", response_model=List[BookOut])
def list_books_by_author(author_id: int, db: Session = Depends(get_db)):
    if not db.get(models.Author, author_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Author not found")
    return db.execute(select(models.Book).where(models.Book.author_id == author_id)).scalars().all()
