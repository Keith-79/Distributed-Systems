from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict

from .db import engine, SessionLocal
from .models import Base, POI, Restaurant

Base.metadata.create_all(bind=engine)

@dataclass
class Place:
    name: str
    address: str
    lat: float
    lon: float
    tags: str
    price: str = "$$"
    duration: int = 90
    wheelchair: int = 1
    child: int = 1

# -------- Data: 10 cities (3 POIs + 3 restaurants each) --------
# Notes:
# - tags are simple, for filtering (e.g., "museum,art", "cafe,coffee", "vegan").
# - price tiers are rough ($/$$/$$$) just for demo.
# - lat/lon are approximate but valid for map pins.

CITY_DATA: Dict[str, Dict[str, List[Place]]] = {
    "New York, NY": {
        "pois": [
            Place("Central Park", "Central Park, New York, NY", 40.7829, -73.9654, "park,kid-friendly,stroller"),
            Place("American Museum of Natural History", "200 Central Park W, New York, NY", 40.7813, -73.9735, "museum,science,wheelchair", "$$", 120),
            Place("The High Line", "High Line, New York, NY", 40.7479, -74.0049, "park,art,viewpoint"),
        ],
        "restaurants": [
            Place("Beyond Sushi", "62 W 56th St, New York, NY", 40.7637, -73.9767, "vegan,asian", "$$"),
            Place("Le Botaniste", "127 Grand St, New York, NY", 40.7216, -73.9989, "vegan,gluten-free", "$$"),
            Place("Joe Coffee Company", "141 Waverly Pl, New York, NY", 40.7315, -74.0017, "cafe,coffee", "$"),
        ],
    },
    "Los Angeles, CA": {
        "pois": [
            Place("Griffith Observatory", "2800 E Observatory Rd, Los Angeles, CA", 34.1184, -118.3004, "viewpoint,science,wheelchair", "$$", 120),
            Place("The Getty Center", "1200 Getty Center Dr, Los Angeles, CA", 34.0780, -118.4741, "museum,art,garden,wheelchair", "$$", 120),
            Place("Santa Monica Pier", "200 Santa Monica Pier, Santa Monica, CA", 34.0094, -118.4973, "park,viewpoint,kid-friendly"),
        ],
        "restaurants": [
            Place("Cafe Gratitude", "512 Rose Ave, Venice, CA", 33.9989, -118.4740, "vegan,organic", "$$"),
            Place("Intelligentsia Coffee", "1331 Abbot Kinney Blvd, Venice, CA", 33.9916, -118.4620, "cafe,coffee", "$"),
            Place("In-N-Out Burger", "9149 S Sepulveda Blvd, Los Angeles, CA", 33.9553, -118.3960, "burger,fast-food", "$"),
        ],
    },
    "Chicago, IL": {
        "pois": [
            Place("Millennium Park", "201 E Randolph St, Chicago, IL", 41.8826, -87.6226, "park,art,kid-friendly"),
            Place("Art Institute of Chicago", "111 S Michigan Ave, Chicago, IL", 41.8796, -87.6237, "museum,art,wheelchair", "$$", 120),
            Place("Navy Pier", "600 E Grand Ave, Chicago, IL", 41.8917, -87.6078, "park,viewpoint,kid-friendly"),
        ],
        "restaurants": [
            Place("Lou Malnati's Pizzeria", "439 N Wells St, Chicago, IL", 41.8904, -87.6344, "pizza,restaurant", "$$"),
            Place("Beatrix", "519 N Clark St, Chicago, IL", 41.8909, -87.6315, "american,vegetarian-options", "$$"),
            Place("Intelligentsia Coffee Broadway", "3123 N Broadway, Chicago, IL", 41.9374, -87.6446, "cafe,coffee", "$"),
        ],
    },
    "Miami, FL": {
        "pois": [
            Place("South Beach", "Ocean Dr, Miami Beach, FL", 25.7826, -80.1341, "beach,park,viewpoint"),
            Place("Vizcaya Museum & Gardens", "3251 S Miami Ave, Miami, FL", 25.7449, -80.2103, "museum,garden,wheelchair", "$$", 120),
            Place("Wynwood Walls", "2516 NW 2nd Ave, Miami, FL", 25.8007, -80.1998, "art,attraction,viewpoint"),
        ],
        "restaurants": [
            Place("PLANTA South Beach", "850 Commerce St, Miami Beach, FL", 25.7716, -80.1344, "vegan,gluten-free", "$$"),
            Place("Versailles Cuban Restaurant", "3555 SW 8th St, Miami, FL", 25.7650, -80.2065, "cuban,restaurant", "$$"),
            Place("Panther Coffee Wynwood", "2390 NW 2nd Ave, Miami, FL", 25.7997, -80.1992, "cafe,coffee", "$"),
        ],
    },
    "San Francisco, CA": {
        "pois": [
            Place("Golden Gate Bridge Welcome Center", "Golden Gate Bridge, San Francisco, CA", 37.8078, -122.4750, "viewpoint,park"),
            Place("California Academy of Sciences", "55 Music Concourse Dr, San Francisco, CA", 37.7699, -122.4661, "museum,science,wheelchair", "$$", 120),
            Place("Fisherman's Wharf", "Fisherman's Wharf, San Francisco, CA", 37.8080, -122.4177, "park,attraction,kid-friendly"),
        ],
        "restaurants": [
            Place("Tartine Bakery", "600 Guerrero St, San Francisco, CA", 37.7615, -122.4241, "bakery,cafe", "$"),
            Place("Blue Bottle Coffee Ferry Building", "1 Ferry Building, San Francisco, CA", 37.7955, -122.3937, "cafe,coffee", "$"),
            Place("Shizen Vegan Sushi Bar", "370 14th St, San Francisco, CA", 37.7680, -122.4214, "vegan,japanese", "$$"),
        ],
    },
    "Seattle, WA": {
        "pois": [
            Place("Pike Place Market", "85 Pike St, Seattle, WA", 47.6094, -122.3417, "market,attraction,kid-friendly"),
            Place("Space Needle", "400 Broad St, Seattle, WA", 47.6205, -122.3493, "viewpoint,attraction,wheelchair", "$$", 90),
            Place("Museum of Pop Culture", "325 5th Ave N, Seattle, WA", 47.6215, -122.3480, "museum,art,wheelchair", "$$", 120),
        ],
        "restaurants": [
            Place("Cafe Flora", "2901 E Madison St, Seattle, WA", 47.6206, -122.2958, "vegetarian,vegan-options", "$$"),
            Place("Starbucks Reserve Roastery", "1124 Pike St, Seattle, WA", 47.6146, -122.3280, "cafe,coffee", "$"),
            Place("Tilikum Place Cafe", "407 Cedar St, Seattle, WA", 47.6176, -122.3483, "cafe,brunch", "$$"),
        ],
    },
    "Austin, TX": {
        "pois": [
            Place("Zilker Metropolitan Park", "2100 Barton Springs Rd, Austin, TX", 30.2669, -97.7729, "park,kid-friendly"),
            Place("Barton Springs Pool", "2201 Barton Springs Rd, Austin, TX", 30.2649, -97.7713, "park,swimming"),
            Place("Bullock Texas State History Museum", "1800 Congress Ave, Austin, TX", 30.2803, -97.7394, "museum,history,wheelchair", "$$", 120),
        ],
        "restaurants": [
            Place("Veracruz All Natural", "1704 E Cesar Chavez St, Austin, TX", 30.2584, -97.7246, "mexican,tacos", "$"),
            Place("JuiceLand", "1625 Barton Springs Rd, Austin, TX", 30.2628, -97.7659, "juice,vegan-options", "$"),
            Place("Epoch Coffee", "221 W North Loop Blvd, Austin, TX", 30.3230, -97.7236, "cafe,coffee", "$"),
        ],
    },
    "Boston, MA": {
        "pois": [
            Place("Boston Common", "139 Tremont St, Boston, MA", 42.3550, -71.0656, "park,kid-friendly"),
            Place("Museum of Fine Arts, Boston", "465 Huntington Ave, Boston, MA", 42.3394, -71.0942, "museum,art,wheelchair", "$$", 120),
            Place("New England Aquarium", "1 Central Wharf, Boston, MA", 42.3591, -71.0499, "museum,science,kid-friendly", "$$", 120),
        ],
        "restaurants": [
            Place("Tatte Bakery & Cafe (Beacon St)", "1003 Beacon St, Brookline, MA", 42.3459, -71.1111, "bakery,cafe", "$"),
            Place("Clover Food Lab", "27 School St, Boston, MA", 42.3576, -71.0585, "vegetarian,vegan-options", "$"),
            Place("Flour Bakery + Cafe", "131 Clarendon St, Boston, MA", 42.3480, -71.0747, "bakery,cafe", "$"),
        ],
    },
    "Denver, CO": {
        "pois": [
            Place("Denver Botanic Gardens", "1007 York St, Denver, CO", 39.7320, -104.9610, "garden,park,wheelchair", "$$", 120),
            Place("Denver Art Museum", "100 W 14th Ave Pkwy, Denver, CO", 39.7372, -104.9899, "museum,art,wheelchair", "$$", 120),
            Place("Red Rocks Park and Amphitheatre", "18300 W Alameda Pkwy, Morrison, CO", 39.6654, -105.2057, "park,viewpoint"),
        ],
        "restaurants": [
            Place("City O' City", "206 E 13th Ave, Denver, CO", 39.7367, -104.9842, "vegetarian,vegan-options", "$$"),
            Place("Little Owl Coffee", "1555 Blake St #150, Denver, CO", 39.7506, -105.0014, "cafe,coffee", "$"),
            Place("Root Down", "1600 W 33rd Ave, Denver, CO", 39.7652, -105.0074, "american,vegetarian-options", "$$"),
        ],
    },
    "Phoenix, AZ": {
        "pois": [
            Place("Desert Botanical Garden", "1201 N Galvin Pkwy, Phoenix, AZ", 33.4606, -111.9477, "garden,park,wheelchair", "$$", 120),
            Place("Heard Museum", "2301 N Central Ave, Phoenix, AZ", 33.4710, -112.0723, "museum,art,wheelchair", "$$", 120),
            Place("Phoenix Zoo", "455 N Galvin Pkwy, Phoenix, AZ", 33.4510, -111.9483, "park,zoo,kid-friendly", "$$", 120),
        ],
        "restaurants": [
            Place("Pizzeria Bianco (Heritage Sq)", "623 E Adams St, Phoenix, AZ", 33.4499, -112.0663, "pizza,restaurant", "$$"),
            Place("Cartel Coffee Lab (Downtown)", "1 N 1st St, Phoenix, AZ", 33.4486, -112.0736, "cafe,coffee", "$"),
            Place("Green New American Vegetarian", "2022 N 7th St, Phoenix, AZ", 33.4719, -112.0646, "vegetarian,vegan", "$$"),
        ],
    },
}

def upsert_city(city: str, data: Dict[str, List[Place]], db):
    # prevent duplicates by (name, city)
    existing_pois = {(n, c) for n, c in db.query(POI.name, POI.city).all()}
    existing_rest = {(n, c) for n, c in db.query(Restaurant.name, Restaurant.city).all()}

    for p in data.get("pois", []):
        key = (p.name, city)
        if key in existing_pois:
            continue
        db.add(POI(
            name=p.name, address=p.address, lat=p.lat, lon=p.lon,
            tags=p.tags, price_tier=p.price, duration_minutes=p.duration,
            wheelchair_friendly=p.wheelchair, child_friendly=p.child, city=city
        ))

    for r in data.get("restaurants", []):
        key = (r.name, city)
        if key in existing_rest:
            continue
        db.add(Restaurant(
            name=r.name, address=r.address, lat=r.lat, lon=r.lon,
            tags=r.tags, price_tier=r.price, city=city
        ))

def main():
    db = SessionLocal()
    try:
        for city, data in CITY_DATA.items():
            upsert_city(city, data, db)
        db.commit()
        print(f"✅ Seeded {len(CITY_DATA)} cities (POIs + Restaurants).")
    finally:
        db.close()

if __name__ == "__main__":
    main()
