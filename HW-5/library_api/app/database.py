from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

# ✅ Load .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# ✅ Create engine
engine = create_engine(DATABASE_URL, echo=True)

# ✅ Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ✅ Base for models to inherit
Base = declarative_base()

# ✅ Dependency to use in routers
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
