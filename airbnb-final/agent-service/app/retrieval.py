from typing import List, Dict, Tuple
import httpx
from .config import settings
from langchain_community.tools.tavily_search import TavilySearchResults

HTTP_TIMEOUT = 15.0

# ---------- Optional: events via Tavily ----------

def fetch_local_events(city: str, start_iso: str, end_iso: str) -> List[Dict]:
    """Optional Tavily search for events. Returns [] if key missing or any error."""
    if not settings.tavily_api_key:
        return []
    try:
        tool = TavilySearchResults(api_key=settings.tavily_api_key, max_results=5)
        hits = tool.invoke({"query": f"events in {city} between {start_iso} and {end_iso}"}) or []
    except Exception:
        return []
    return [{"name": h.get("title", "Event"), "url": h.get("url", ""), "tags": ["event"]} for h in hits]


# ---------- Places via OpenStreetMap (Overpass) with mirrors & widening ----------

def _build_overpass_query(lat: float, lon: float, radius_m: int, filters: List[Tuple[str, str]]) -> str:
    parts: List[str] = []
    for key, regex in filters:
        parts.append(f'node(around:{radius_m},{lat},{lon})[{key}~"{regex}"];')
        parts.append(f'way(around:{radius_m},{lat},{lon})[{key}~"{regex}"];')
        parts.append(f'relation(around:{radius_m},{lat},{lon})[{key}~"{regex}"];')
    inner = "\n      ".join(parts)
    ql = (
        "[out:json][timeout:25];\n"
        "(\n"
        f"      {inner}\n"
        ");\n"
        "out center 200;"
    )
    return ql

def _overpass_query_any(lat: float, lon: float, radius_km: float, filters: List[Tuple[str, str]]) -> List[Dict]:
    """Try multiple mirrors; if all fail/empty, return []."""
    radius_m = int(radius_km * 1000)
    ql = _build_overpass_query(lat, lon, radius_m, filters)
    for url in settings.overpass_endpoints:
        try:
            r = httpx.post(url, data={"data": ql}, timeout=HTTP_TIMEOUT)
            r.raise_for_status()
            data = r.json()
            elements = data.get("elements", [])
            if elements:
                return elements
        except Exception:
            continue
    return []

# Broad but relevant categories
POI_FILTERS = [
    ("tourism", "museum|attraction|gallery|viewpoint|artwork"),
    ("leisure", "park|playground|garden|sports_centre"),
    ("amenity", "library|arts_centre|theatre"),
]

RESTO_FILTERS = [
    ("amenity", "restaurant|cafe|fast_food|ice_cream|bar|pub"),
    ("shop", "coffee|tea|confectionery"),
]

def fetch_osm_pois(lat: float, lon: float, radius_km: float, max_radius_km: float) -> List[Dict]:
    """Attractions/parks/museums etc. Widens radius up to max if empty."""
    cur = radius_km
    while cur <= max_radius_km:
        elements = _overpass_query_any(lat, lon, cur, POI_FILTERS)
        pois = _elements_to_pois(elements)
        if pois:
            return _dedup_by_title(pois)[: settings.max_pois]
        cur += max(1.5, cur * 0.5)  # widen progressively
    return []

def fetch_osm_restaurants(lat: float, lon: float, radius_km: float, max_radius_km: float) -> List[Dict]:
    """Restaurants & cafés; widens radius up to max if empty."""
    cur = radius_km
    while cur <= max_radius_km:
        elements = _overpass_query_any(lat, lon, cur, RESTO_FILTERS)
        restos = _elements_to_restos(elements)
        if restos:
            return _dedup_by_title(restos)[: settings.max_restaurants]
        cur += max(1.5, cur * 0.5)
    return []

def _elements_to_pois(elements: List[Dict]) -> List[Dict]:
    out = []
    for e in elements:
        tags = e.get("tags") or {}
        name = tags.get("name")
        if not name:
            continue
        la = e.get("lat") or (e.get("center") or {}).get("lat")
        lo = e.get("lon") or (e.get("center") or {}).get("lon")
        if la is None or lo is None:
            continue
        cat = []
        for k in ("tourism", "leisure", "amenity"):
            if tags.get(k):
                cat.append(tags[k])
        wheelchair = tags.get("wheelchair") in {"yes", "designated"}
        out.append(
            {
                "title": name,
                "address": tags.get("addr:full") or tags.get("addr:street") or "",
                "geo": (float(la), float(lo)),
                "price_tier": "$$",
                "duration_minutes": 90,
                "tags": list({*cat, *(tags.get("cuisine", "").replace(";", ",").split(","))}),
                "wheelchair_friendly": wheelchair,
                "child_friendly": True,
            }
        )
    return out

def _elements_to_restos(elements: List[Dict]) -> List[Dict]:
    out = []
    for e in elements:
        tags = e.get("tags") or {}
        name = tags.get("name")
        if not name:
            continue
        la = e.get("lat") or (e.get("center") or {}).get("lat")
        lo = e.get("lon") or (e.get("center") or {}).get("lon")
        if la is None or lo is None:
            continue

        cuisines = (tags.get("cuisine", "") or "").replace(";", ",")
        diet_tags = []
        if "vegan" in cuisines.lower() or tags.get("diet:vegan") in {"yes", "only"}:
            diet_tags.append("vegan")
        if "vegetarian" in cuisines.lower() or tags.get("diet:vegetarian") in {"yes", "only"}:
            diet_tags.append("vegetarian")
        if tags.get("diet:gluten_free") in {"yes", "only"}:
            diet_tags.append("gluten-free")

        taglist = [t.strip() for t in (cuisines.split(",") if cuisines else []) if t.strip()]
        taglist += diet_tags
        if not taglist and tags.get("amenity") == "cafe":
            taglist = ["cafe"]
        if not taglist and tags.get("amenity") == "restaurant":
            taglist = ["restaurant"]

        out.append(
            {
                "title": name,
                "address": tags.get("addr:full") or tags.get("addr:street") or "",
                "geo": (float(la), float(lo)),
                "price_tier": "$$",
                "tags": sorted(set(taglist)) or ["restaurant"],
            }
        )
    return out

def _dedup_by_title(items: List[Dict]) -> List[Dict]:
    seen, out = set(), []
    for x in items:
        t = x.get("title") or ""
        if t in seen:
            continue
        seen.add(t)
        out.append(x)
    return out
