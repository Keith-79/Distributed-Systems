from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy import String, Integer, TIMESTAMP, ForeignKey, UniqueConstraint, func
from datetime import datetime

from .database import Base



class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    books: Mapped[list["Book"]] = relationship(
        back_populates="author",
        cascade="save-update, merge",
        passive_deletes=True,
    )


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("isbn", name="uq_books_isbn"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    isbn: Mapped[str] = mapped_column(String(20), nullable=False)
    publication_year: Mapped[int] = mapped_column(nullable=False)
    available_copies: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("authors.id", onupdate="CASCADE", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    author: Mapped["Author"] = relationship(back_populates="books")
