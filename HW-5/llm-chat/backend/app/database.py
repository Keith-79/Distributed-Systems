from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

class Base(DeclarativeBase):
    pass

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    from . import models  # register models
    Base.metadata.create_all(bind=engine)
