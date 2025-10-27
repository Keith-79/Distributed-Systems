from datetime import date
import httpx

HTTP_TIMEOUT = 8.0

def geocode_city(city: str) -> tuple[float, float]:
    try:
        r = httpx.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1},
            timeout=HTTP_TIMEOUT,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("results"):
            it = data["results"][0]
            return float(it["latitude"]), float(it["longitude"])
    except Exception:
        pass
    return (0.0, 0.0)

def daily_weather(lat: float, lon: float, start: date, end: date):
    try:
        r = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat, "longitude": lon,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_mean",
                "timezone": "auto",
            },
            timeout=HTTP_TIMEOUT,
        )
        r.raise_for_status()
        return r.json().get("daily", {})
    except Exception:
        return {}

def summarize_weather(daily) -> str:
    if not daily:
        return "Weather data unavailable."
    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []
    precip = daily.get("precipitation_probability_mean") or []
    if not (tmax and tmin):
        return "Weather data unavailable."
    hi = int(max(tmax))
    lo = int(min(tmin))
    wet_days = sum(1 for p in precip if (p or 0) >= 40)
    return f"Temps ~{lo}–{hi}°C, {wet_days} likely rainy day(s)."

def packing_list(daily, mobility: str | None):
    base = ["comfortable shoes","reusable water bottle","phone power bank","sunscreen","light jacket"]
    if not daily:
        return base
    precip = daily.get("precipitation_probability_mean") or []
    if any((p or 0) >= 40 for p in precip):
        base += ["compact umbrella","rain jacket"]
    tmin = daily.get("temperature_2m_min") or []
    if tmin and min(tmin) <= 10:
        base += ["warm layer","beanie"]
    if mobility == "stroller":
        base += ["foldable stroller rain cover"]
    return sorted(set(base))
