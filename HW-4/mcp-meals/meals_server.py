# meals_server.py
import asyncio
import logging
import sys
from typing import List, Dict, Any

import httpx
from mcp.server.fastmcp import FastMCP

# --- Logging to STDERR only (never stdout for STDIO servers) ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)

mcp = FastMCP("meals")

API_BASE = "https://www.themealdb.com/api/json/v1/1"


def _clamp(n: int, lo: int, hi: int) -> int:
    try:
        n = int(n)
    except Exception:
        n = lo
    return max(lo, min(hi, n))


@mcp.tool()
async def search_meals_by_name(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search meal by name (TheMealDB /search.php?s=<query>)
    Input: query: str, limit: int (1–25)
    Output: list[{ id, name, area, category, thumb }]
    """
    q = (query or "").strip()
    if not q:
        return []  # empty query -> empty list (clean UX)

    limit = _clamp(limit, 1, 25)
    url = f"{API_BASE}/search.php"
    params = {"s": q}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        # Inspector shows this nicely
        raise RuntimeError(f"Network error calling TheMealDB: {e}") from e
    except ValueError as e:
        raise RuntimeError(f"Invalid JSON from TheMealDB: {e}") from e

    meals = data.get("meals")
    if meals is None:
        # No results case per API
        return []

    out: List[Dict[str, Any]] = []
    for m in meals:
        out.append({
            "id": m.get("idMeal"),
            "name": m.get("strMeal"),
            "area": m.get("strArea"),
            "category": m.get("strCategory"),
            "thumb": m.get("strMealThumb"),
        })
        if len(out) >= limit:
            break
    return out


@mcp.tool()
async def meals_by_ingredient(ingredient: str, limit: int = 12):
    """
    Filter by main ingredient (TheMealDB /filter.php?i=<ingredient>)
    Output: list[{ id, name, thumb }]
    """
    ing = (ingredient or "").strip()
    if not ing:
        return []
    limit = _clamp(limit, 1, 50)

    url = f"{API_BASE}/filter.php"
    params = {"i": ing}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise RuntimeError(f"Network error calling TheMealDB: {e}") from e
    except ValueError as e:
        raise RuntimeError(f"Invalid JSON from TheMealDB: {e}") from e

    meals = data.get("meals")
    if meals is None:
        return []

    out = []
    for m in meals:
        out.append({
            "id": m.get("idMeal"),
            "name": m.get("strMeal"),
            "thumb": m.get("strMealThumb"),
        })
        if len(out) >= limit:
            break
    return out


def _extract_ingredients(meal: Dict[str, Any]) -> List[Dict[str, str]]:
    """Collect non-empty ingredient/measure pairs from strIngredient1..20."""
    items = []
    for i in range(1, 21):
        name = (meal.get(f"strIngredient{i}") or "").strip()
        measure = (meal.get(f"strMeasure{i}") or "").strip()
        if name:
            items.append({"name": name, "measure": measure})
    return items


@mcp.tool()
async def meal_details(id: str):
    """
    Lookup by id (TheMealDB /lookup.php?i=<id>)
    Output: { id, name, category, area, instructions, image, source, youtube, ingredients: [{name, measure}] }
    """
    mid = (str(id) if id is not None else "").strip()
    if not mid:
        raise ValueError("id is required")

    url = f"{API_BASE}/lookup.php"
    params = {"i": mid}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise RuntimeError(f"Network error calling TheMealDB: {e}") from e
    except ValueError as e:
        raise RuntimeError(f"Invalid JSON from TheMealDB: {e}") from e

    meals = data.get("meals") or []
    if not meals:
        return None

    m = meals[0]
    return {
        "id": m.get("idMeal"),
        "name": m.get("strMeal"),
        "category": m.get("strCategory"),
        "area": m.get("strArea"),
        "instructions": m.get("strInstructions"),
        "image": m.get("strMealThumb"),
        "source": m.get("strSource"),
        "youtube": m.get("strYoutube"),
        "ingredients": _extract_ingredients(m),
    }


@mcp.tool()
async def random_meal():
    """
    Random (TheMealDB /random.php)
    Output: same shape as meal_details
    """
    url = f"{API_BASE}/random.php"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.RequestError, httpx.HTTPStatusError) as e:
        raise RuntimeError(f"Network error calling TheMealDB: {e}") from e
    except ValueError as e:
        raise RuntimeError(f"Invalid JSON from TheMealDB: {e}") from e

    meals = data.get("meals") or []
    if not meals:
        return None

    m = meals[0]
    return {
        "id": m.get("idMeal"),
        "name": m.get("strMeal"),
        "category": m.get("strCategory"),
        "area": m.get("strArea"),
        "instructions": m.get("strInstructions"),
        "image": m.get("strMealThumb"),
        "source": m.get("strSource"),
        "youtube": m.get("strYoutube"),
        "ingredients": _extract_ingredients(m),
    }

if __name__ == "__main__":
    asyncio.run(mcp.run())
