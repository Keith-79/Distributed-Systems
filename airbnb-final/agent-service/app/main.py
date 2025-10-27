from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import logging, traceback

from .db import get_db, engine
from .models import Base, Booking, Preference, PlanRun
from .schemas import AgentRequest, AgentResponse, PlanResponse
from .agent import build_plan

logger = logging.getLogger("uvicorn.error")

# Ensure tables (demo-safe; use Alembic in prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Concierge Agent",
    version="1.0.0",
    description="""
Agent that converts booking + preferences + live context into:
- Day-by-day plan (morning/afternoon/evening)
- Activity cards
- Dietary-filtered restaurants
- Weather-aware packing checklist

Test at **POST /agent/plan**. Swagger is this page.
"""
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

@app.get("/")
def index():
    return {"service": "AI Concierge Agent", "docs": "/docs", "post": "/agent/plan"}

@app.get("/health")
def health():
    return {"ok": True, "env": "development"}

@app.post("/agent/plan", response_model=AgentResponse)
def plan(req: AgentRequest, db: Session = Depends(get_db)):
    try:
        # persist booking/preference
        booking = Booking(
            start_date=req.booking.start_date,
            end_date=req.booking.end_date,
            location=req.booking.location,
            party_type=req.booking.party_type
        )
        db.add(booking); db.flush()

        pref = Preference(
            budget_tier=req.preferences.budget_tier,
            interests=",".join(req.preferences.interests),
            mobility=req.preferences.mobility or None,
            dietary=req.preferences.dietary or None
        )
        db.add(pref); db.flush()

        # build plan
        output: dict = build_plan(req.booking, req.preferences, req.ask, db)
        result = PlanResponse.model_validate(output)

        # log run
        run = PlanRun(
            booking_id=booking.id,
            preference_id=pref.id,
            user_query=req.ask or "",
            weather_summary=result.weather_summary,
            result_json=result.model_dump()
        )
        db.add(run); db.commit(); db.refresh(run)

        return AgentResponse(run_id=run.id, output=result)

    except Exception as e:
        db.rollback()
        logger.error("plan() failed: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=400, detail=f"Agent error: {e}")
