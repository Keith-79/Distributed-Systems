from __future__ import annotations
from typing import List, Dict
import random
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage

from .config import settings
from .utils import daterange, to_price_tier, interest_match, mobility_ok
from .retrieval import fetch_local_events, fetch_osm_pois, fetch_osm_restaurants
from .weather import geocode_city, daily_weather, summarize_weather, packing_list

LLM_MODEL = "gpt-4o-mini"

def parse_free_text(ask: str) -> Dict:
    if not ask or not settings.openai_api_key:
        return {}
    import json
    try:
        llm = ChatOpenAI(model=LLM_MODEL, temperature=0, openai_api_key=settings.openai_api_key, timeout=10)
        sys = SystemMessage(content="""Extract structured trip preferences as JSON with keys:
budget_tier one of ["$","$$","$$$"], interests array of strings,
mobility nullable string (e.g., "wheelchair","no-long-hikes","stroller"),
dietary nullable string (e.g., "vegan","halal","gluten-free"). Only return valid JSON.""")
        out = llm.invoke([sys, HumanMessage(content=ask)]).content
        return json.loads(out)
    except Exception:
        return {}

def _load_pois_from_db(city: str, interests: List[str], mobility: str | None, price_tier: str, db_session):
    from .models import POI
    q = db_session.query(POI).filter(POI.city.ilike(f"%{city.split(',')[0]}%")).all()
    cards = []
    for p in q:
        if not interest_match(p.tags, interests):
            continue
        if not mobility_ok(mobility, p.wheelchair_friendly, p.duration_minutes):
            continue
        cards.append({
            "title": p.name,
            "address": p.address,
            "geo": (p.lat, p.lon),
            "price_tier": p.price_tier if p.price_tier in {"$","$$","$$$"} else price_tier,
            "duration_minutes": p.duration_minutes,
            "tags": [t.strip() for t in (p.tags or "").split(",") if t.strip()],
            "wheelchair_friendly": bool(p.wheelchair_friendly),
            "child_friendly": bool(p.child_friendly),
        })
    return cards

def _load_restaurants_from_db(city: str, price_tier: str, db_session):
    from .models import Restaurant
    rs = db_session.query(Restaurant).filter(Restaurant.city.ilike(f"%{city.split(',')[0]}%")).all()
    out = []
    for r in rs:
        tagset = {t.strip().lower() for t in (r.tags or "").split(",") if t.strip()}
        out.append({
            "title": r.name, "address": r.address, "geo": (r.lat, r.lon),
            "price_tier": r.price_tier if r.price_tier in {"$","$$","$$$"} else price_tier,
            "tags": sorted(tagset) or ["restaurant"]
        })
    return out

def _cache_osm_into_db(city: str, pois: List[Dict], restaurants: List[Dict], db_session):
    from .models import POI, Restaurant
    existing_pois = { (p.name, p.city) for p in db_session.query(POI.name, POI.city).all() }
    for p in pois:
        key = (p["title"], city)
        if key in existing_pois: 
            continue
        db_session.add(POI(
            name=p["title"],
            address=p.get("address",""),
            lat=p["geo"][0], lon=p["geo"][1],
            tags=",".join(p.get("tags", [])),
            price_tier=p.get("price_tier","$$"),
            duration_minutes=p.get("duration_minutes", 90),
            wheelchair_friendly=1 if p.get("wheelchair_friendly") else 0,
            child_friendly=1 if p.get("child_friendly") else 0,
            city=city
        ))
    existing_rest = { (r.name, r.city) for r in db_session.query(Restaurant.name, Restaurant.city).all() }
    for r in restaurants:
        key = (r["title"], city)
        if key in existing_rest:
            continue
        db_session.add(Restaurant(
            name=r["title"], address=r.get("address",""),
            lat=r["geo"][0], lon=r["geo"][1],
            tags=",".join(r.get("tags",[])),
            price_tier=r.get("price_tier","$$"),
            city=city
        ))
    try:
        db_session.commit()
    except Exception:
        db_session.rollback()

def _soft_dietary_rank(items: List[Dict], dietary: str | None) -> List[Dict]:
    if not dietary:
        return items
    # prefer matches but don't drop others entirely
    def score(it):
        tags = {t.lower() for t in it.get("tags", [])}
        return (1 if dietary.lower() in tags else 0, -len(tags))
    return sorted(items, key=score, reverse=True)

def pick_activities(city: str, interests: List[str], mobility: str | None, price_tier: str, db_session, lat: float, lon: float):
    cards = _load_pois_from_db(city, interests, mobility, price_tier, db_session)
    if not cards:
        osm = fetch_osm_pois(lat, lon, settings.radius_km, settings.max_radius_km)
        cards = []
        for p in osm:
            if not interest_match(",".join(p.get("tags", [])), interests):
                continue
            if not mobility_ok(mobility, 1 if p.get("wheelchair_friendly") else 0, p.get("duration_minutes",90)):
                continue
            p["price_tier"] = price_tier
            cards.append(p)
        _cache_osm_into_db(city, cards, [], db_session)
    return cards

def pick_restaurants(city: str, dietary: str | None, price_tier: str, db_session, lat: float, lon: float):
    out = _load_restaurants_from_db(city, price_tier, db_session)
    if not out:
        osm = fetch_osm_restaurants(lat, lon, settings.radius_km, settings.max_radius_km)
        out = []
        for r in osm:
            r["price_tier"] = r.get("price_tier","$$") or price_tier
            out.append(r)
        _cache_osm_into_db(city, [], out, db_session)
    # soft dietary preference: rank matches first, keep others
    out = _soft_dietary_rank(out, dietary)
    return out[: settings.max_restaurants]

def allocate_blocks(per_day_items: List[dict]):
    blocks = {"morning": [], "afternoon": [], "evening": []}
    for i, item in enumerate(per_day_items):
        if i % 3 == 0: blocks["morning"].append(item)
        elif i % 3 == 1: blocks["afternoon"].append(item)
        else: blocks["evening"].append(item)
    return blocks

def _restaurants_as_activities(restaurants: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    for r in restaurants or []:
        out.append({
            "title": r.get("title", "Restaurant"),
            "address": r.get("address", ""),
            "geo": r.get("geo", (0.0, 0.0)),
            "price_tier": r.get("price_tier", "$$"),
            "duration_minutes": 75,  # typical meal duration
            "tags": r.get("tags", ["restaurant"]),
            "wheelchair_friendly": True,
            "child_friendly": True,
        })
    return out

def build_plan(booking, preferences, ask, db_session):
    overrides = parse_free_text(ask) if ask else {}
    interests = overrides.get("interests") or preferences.interests
    mobility = overrides.get("mobility") or preferences.mobility
    dietary = overrides.get("dietary") or preferences.dietary
    price_tier = to_price_tier(overrides.get("budget_tier") or preferences.budget_tier)

    lat, lon = geocode_city(booking.location)
    weather = daily_weather(lat, lon, booking.start_date, booking.end_date)
    weather_summary = summarize_weather(weather)
    pack = packing_list(weather, mobility)

    pois = pick_activities(booking.location, interests, mobility, price_tier, db_session, lat, lon)
    restaurants = pick_restaurants(booking.location, dietary, price_tier, db_session, lat, lon)

    events = fetch_local_events(booking.location, booking.start_date.isoformat(), booking.end_date.isoformat())
    event_cards = [{
        "title": e["name"],
        "address": booking.location,
        "geo": (lat, lon),
        "price_tier": price_tier,
        "duration_minutes": 90,
        "tags": e.get("tags", ["event"]),
        "wheelchair_friendly": True,
        "child_friendly": True,
    } for e in events]

    # Build a richer pool: POIs + events + a subset of restaurants as activities
    activity_restaurants = _restaurants_as_activities(restaurants)
    combined_pool = pois + event_cards + activity_restaurants

    # Cap to a reasonable size to avoid overly large itineraries
    if len(combined_pool) > 60:
        combined_pool = combined_pool[:60]

    itinerary: List[Dict] = []
    days = list(daterange(booking.start_date, booking.end_date))
    items_per_day = 3

    if not combined_pool:
        for d in days:
            itinerary.append({
                "date": d.isoformat(),
                "blocks": allocate_blocks([])
            })
    else:
        # Shuffle once, then create cycles; repeats only after the whole pool is used
        base_pool = combined_pool[:]
        random.shuffle(base_pool)
        needed = len(days) * items_per_day
        sequence: List[Dict] = []
        while len(sequence) < needed:
            # add a full non-repeating pass
            sequence.extend(random.sample(base_pool, k=len(base_pool)))

        for i, d in enumerate(days):
            start = i * items_per_day
            day_slice = sequence[start:start+items_per_day]
            itinerary.append({
                "date": d.isoformat(),
                "blocks": allocate_blocks(day_slice)
            })

    note_bits = [f"Auto-fetched within {settings.radius_km}–{settings.max_radius_km}km of {booking.location} (OSM)."]
    if not pois:
        note_bits.append("No POIs found; try increasing RADIUS_KM.")
    if not restaurants:
        note_bits.append("No restaurants found; dietary tags on OSM are sparse.")

    return {
        "itinerary": itinerary,
        "restaurants": restaurants,
        "packing_checklist": pack,
        "weather_summary": weather_summary,
        "notes": " ".join(note_bits),
    }
