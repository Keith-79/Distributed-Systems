from fastapi import FastAPI
from app.core.config import settings
from app.routers import authors, books

app = FastAPI(title=settings.app_name)

app.include_router(authors.router, prefix="/authors", tags=["Authors"])
app.include_router(books.router,   prefix="/books",   tags=["Books"])

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": settings.app_name}
