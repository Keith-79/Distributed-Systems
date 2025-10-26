from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models
from .database import engine
from .routers import authors, books
from .routers import chat  # if you made chat.py

app = FastAPI(title="Library API (dev)")

# 🔓 Allow everything for dev — guarantees the CORS headers appear
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 👈 open for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

app.include_router(authors.router, prefix="/authors", tags=["authors"])
app.include_router(books.router,   prefix="/books",   tags=["books"])
app.include_router(chat.router,                     tags=["chat"])  # optional

@app.get("/ping")
def ping():
    return {"ok": True}
