# library_api/app/routers/books.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..deps import get_db
from .. import models, schemas

router = APIRouter()

@router.post("", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(payload: schemas.BookCreate, db: Session = Depends(get_db)):
    # Ensure author exists
    if not db.get(models.Author, payload.author_id):
        raise HTTPException(status_code=400, detail="author_id does not reference an existing author")

    book = models.Book(
        title=payload.title,
        isbn=payload.isbn,
        publication_year=payload.publication_year,
        available_copies=payload.available_copies,
        author_id=payload.author_id,
    )
    db.add(book)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ISBN already exists")
    db.refresh(book)
    return book

@router.get("", response_model=schemas.BooksPage)
def list_books(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.Book)) or 0
    items = db.execute(
        select(models.Book).order_by(models.Book.id).limit(limit).offset(offset)
    ).scalars().all()
    return {"data": items, "meta": {"limit": limit, "offset": offset, "total": total}}

@router.get("/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.put("/{book_id}", response_model=schemas.BookOut)
def update_book(book_id: int, payload: schemas.BookUpdate, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # If changing author, ensure it exists
    if payload.author_id is not None and not db.get(models.Author, payload.author_id):
        raise HTTPException(status_code=400, detail="author_id does not reference an existing author")

    if payload.title is not None:             book.title = payload.title
    if payload.isbn is not None:              book.isbn = payload.isbn
    if payload.publication_year is not None:  book.publication_year = payload.publication_year
    if payload.available_copies is not None:  book.available_copies = payload.available_copies
    if payload.author_id is not None:         book.author_id = payload.author_id

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ISBN already exists")
    db.refresh(book)
    return book

@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    # 204: no content body
    return

# Extra: Get all books by a specific author
@router.get("/by-author/{author_id}", response_model=schemas.BooksPage)
def books_by_author(
    author_id: int,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if not db.get(models.Author, author_id):
        raise HTTPException(status_code=404, detail="Author not found")
    q = select(models.Book).where(models.Book.author_id == author_id).order_by(models.Book.id)
    total = db.scalar(
        select(func.count()).select_from(models.Book).where(models.Book.author_id == author_id)
    ) or 0
    items = db.execute(q.limit(limit).offset(offset)).scalars().all()
    return {"data": items, "meta": {"limit": limit, "offset": offset, "total": total}}
