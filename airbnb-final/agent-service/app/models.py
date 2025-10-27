from __future__ import annotations
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Date, DateTime, Text, Float, ForeignKey, JSON, func
from datetime import date, datetime

class Base(DeclarativeBase):
    pass

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    location: Mapped[str] = mapped_column(String(120))
    party_type: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class Preference(Base):
    __tablename__ = "preferences"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    budget_tier: Mapped[str] = mapped_column(String(20))
    interests: Mapped[str] = mapped_column(Text)
    mobility: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dietary: Mapped[str | None] = mapped_column(String(120), nullable=True)

class PlanRun(Base):
    __tablename__ = "plan_runs"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"))
    preference_id: Mapped[int] = mapped_column(ForeignKey("preferences.id"))
    user_query: Mapped[str] = mapped_column(Text, default="")
    weather_summary: Mapped[str] = mapped_column(Text, default="")
    result_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

class POI(Base):
    __tablename__ = "pois"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    tags: Mapped[str] = mapped_column(String(200))
    price_tier: Mapped[str] = mapped_column(String(10), default="$$")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90)
    wheelchair_friendly: Mapped[int] = mapped_column(Integer, default=0)
    child_friendly: Mapped[int] = mapped_column(Integer, default=1)
    city: Mapped[str] = mapped_column(String(120))

class Restaurant(Base):
    __tablename__ = "restaurants"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(String(200))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    tags: Mapped[str] = mapped_column(String(200))
    price_tier: Mapped[str] = mapped_column(String(10), default="$$")
    city: Mapped[str] = mapped_column(String(120))
