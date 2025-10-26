import { Link, useLocation, useNavigate } from "react-router-dom";
import { favouritesApi } from "../../api/favourites";
import { useToast } from "../Toast";
import { useState, useCallback } from "react";

export default function PropertyCard({ property, badge }) {
  const { search } = useLocation();
  const pid = property?.id ?? property?._id;

  const rawImg = property.thumbnailUrl || property.thumbnail_url || property.image || property.thumbnail || null;
  const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  const img = rawImg && String(rawImg).startsWith('/') ? `${apiBase}${rawImg}` : rawImg;

  const title = property.title || property.name || "Property";
  const city = property.city || property.location_city || null;
  const country = property.country || null;
  const price = property.price_per_night ?? property.pricePerNight ?? property.price ?? null;
  const [fav, setFav] = useState(Boolean(property?.isFavourited));
  const nav = useNavigate();
  const toast = useToast();
  const onFav = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation();
    const prev = fav; setFav(!prev);
    try {
      await favouritesApi.toggle(pid);
      if (!prev) {
        toast?.success?.('Added to favorites');
      } else {
        toast?.info?.('Removed from favorites');
      }
    } catch { setFav(prev); }
  }, [fav, pid, toast]);

  if (!property) return null;


  return (
    <Link
      to={{ pathname: `/property/${pid}`, search }}
      className="group block rounded-2xl overflow-hidden bg-white shadow-card hover:shadow-md transition relative"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="relative h-56 w-full bg-gray-100 overflow-hidden">
        {badge ? (
          <div className="absolute top-2 left-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-medium text-gray-800 shadow-card">
            {badge}
          </div>
        ) : null}
        <button
          aria-label="Favourite"
          title="Favourite"
          onClick={onFav}
          className={`absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-card z-30 pointer-events-auto ${fav? 'text-red-600':'text-gray-700'}`}
        >
          {fav ? '❤' : '♡'}
        </button>
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform z-0" />
        ) : null}
      </div>
      <div className="p-3">
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-sm text-gray-600">{[city, country].filter(Boolean).join(", ")}</div>
        <div className="mt-1 font-semibold">{price != null ? (<><span>${price}</span><span className="text-gray-600 font-normal"> /night</span></>) : '—'}</div>
      </div>
    </Link>
  );
}
