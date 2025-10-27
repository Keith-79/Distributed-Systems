from datetime import date, timedelta
from typing import Iterable

def daterange(d1: date, d2: date):
    cur = d1
    while cur <= d2:
        yield cur
        cur += timedelta(days=1)

def to_price_tier(budget: str) -> str:
    return budget if budget in {"$", "$$", "$$$"} else "$$"

def interest_match(tags: str, interests: Iterable[str]) -> bool:
    tagset = {t.strip().lower() for t in (tags or "").split(",")}
    wants = {i.strip().lower() for i in interests or []}
    return bool(tagset & wants) if wants else True

def mobility_ok(mobility: str | None, wheelchair_flag: int, duration: int) -> bool:
    if mobility == "wheelchair":
        return wheelchair_flag == 1
    if mobility == "no-long-hikes":
        return duration <= 120
    return True
