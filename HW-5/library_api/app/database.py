import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# If DATABASE_URL is set, use it; otherwise default to SQLite file
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # If you later want MySQL, set DATABASE_URL in .env:
    # mysql+pymysql://USER:PASSWORD@HOST:PORT/DBNAME
    DATABASE_URL = "sqlite:///./library.db"

# sqlite needs check_same_thread False; other drivers ignore this kwarg
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
