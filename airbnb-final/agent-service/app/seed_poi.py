from .db import engine, SessionLocal
from .models import Base, POI, Restaurant

Base.metadata.create_all(bind=engine)
db = SessionLocal()
city = "San Francisco, CA"

sample_pois = [
  dict(name="Exploratorium", address="Pier 15, SF", lat=37.8014, lon=-122.3989,
       tags="museum,science,kid-friendly,wheelchair", price_tier="$$", duration_minutes=120,
       wheelchair_friendly=1, child_friendly=1, city=city),
  dict(name="Golden Gate Park Playground", address="Golden Gate Park, SF", lat=37.7694, lon=-122.4862,
       tags="park,kid-friendly,stroller", price_tier="$", duration_minutes=90, wheelchair_friendly=1,
       child_friendly=1, city=city),
  dict(name="SF MOMA", address="151 3rd St, SF", lat=37.7857, lon=-122.4011,
       tags="museum,art,wheelchair", price_tier="$$$", duration_minutes=120,
       wheelchair_friendly=1, child_friendly=1, city=city),
]

sample_rest = [
  dict(name="Shizen Vegan Sushi Bar", address="370 14th St, SF", lat=37.7680, lon=-122.4214,
       tags="vegan,gluten-free", price_tier="$$", city=city),
  dict(name="Nourish Cafe", address="189 6th Ave, SF", lat=37.7816, lon=-122.4644,
       tags="vegan", price_tier="$", city=city),
  dict(name="Little Gem", address="400 Grove St, SF", lat=37.7777, lon=-122.4236,
       tags="gluten-free", price_tier="$$", city=city),
]

for p in sample_pois: db.add(POI(**p))
for r in sample_rest: db.add(Restaurant(**r))
db.commit(); db.close()
print("Seeded sample POIs and Restaurants.")
