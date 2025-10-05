from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from fastapi.responses import JSONResponse
from app.deps import get_db
from app import models
from app import schemas

router = APIRouter()

@router.post("", response_model=schemas.AuthorOut, status_code=status.HTTP_201_CREATED)
def create_author(author_in: schemas.AuthorCreate, db: Session = Depends(get_db)):
    # ✅ Check only for duplicate email
    existing = db.execute(
        select(models.Author).where(models.Author.email == author_in.email)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    author = models.Author(**author_in.model_dump())
    db.add(author)
    db.commit()
    db.refresh(author)
    return author

@router.get("", response_model=schemas.AuthorsPage)
def list_authors(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.Author)) or 0
    items = db.execute(
        select(models.Author).order_by(models.Author.id).limit(limit).offset(offset)
    ).scalars().all()
    return {"data": items, "meta": {"limit": limit, "offset": offset, "total": total}}

@router.get("/{author_id}", response_model=schemas.AuthorOut)
def get_author(author_id: int, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author

@router.put("/{author_id}", response_model=schemas.AuthorOut)
def update_author(author_id: int, payload: schemas.AuthorUpdate, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    if payload.first_name is not None: author.first_name = payload.first_name
    if payload.last_name  is not None: author.last_name  = payload.last_name
    if payload.email      is not None: author.email      = payload.email

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists")
    db.refresh(author)
    return author

@router.delete("/{author_id}", responses={200: {"description": "Author deleted"}})
def delete_author(author_id: int, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    has_books = db.scalar(
        select(func.count()).select_from(models.Book).where(models.Book.author_id == author_id)
    )
    if has_books:
        raise HTTPException(status_code=400, detail="Cannot delete author with existing books")

    db.delete(author)
    db.commit()
    return JSONResponse(status_code=200, content={"detail": "Author deleted"})
