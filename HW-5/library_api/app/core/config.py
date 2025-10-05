from pydantic import BaseModel
import os

class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "Library API")
    database_url: str = os.getenv("DATABASE_URL", "mysql+pymysql://library_user:password@localhost:3306/library_db")

settings = Settings()
