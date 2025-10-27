from __future__ import annotations
from datetime import date
from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

class BookingIn(BaseModel):
    start_date: date
    end_date: date
    location: str
    party_type: Literal["couple", "family", "friends", "business"]

class PreferencesIn(BaseModel):
    budget_tier: Literal["$", "$$", "$$$"] = "$$"
    interests: List[str] = Field(default_factory=list)
    mobility: Optional[str] = None
    dietary: Optional[str] = None

class ActivityCard(BaseModel):
    title: str
    address: str
    geo: Tuple[float, float]
    price_tier: Literal["$", "$$", "$$$"]
    duration_minutes: int
    tags: List[str]
    wheelchair_friendly: bool
    child_friendly: bool

class DayBlock(BaseModel):
    morning: List[ActivityCard] = Field(default_factory=list)
    afternoon: List[ActivityCard] = Field(default_factory=list)
    evening: List[ActivityCard] = Field(default_factory=list)

class DayPlan(BaseModel):
    date: str
    blocks: DayBlock

class RestaurantCard(BaseModel):
    title: str
    address: str
    geo: Tuple[float, float]
    price_tier: Literal["$", "$$", "$$$"]
    tags: List[str]

class PlanResponse(BaseModel):
    itinerary: List[DayPlan]
    restaurants: List[RestaurantCard]
    packing_checklist: List[str]
    weather_summary: str
    notes: Optional[str] = None

class AgentRequest(BaseModel):
    booking: BookingIn
    preferences: PreferencesIn
    ask: Optional[str] = None

class AgentResponse(BaseModel):
    run_id: int
    output: PlanResponse
