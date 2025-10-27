import { useParams, Link } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";
import BookNowForm from "../../components/BookNowForm";

function ratingFromId(id) {
  const n = Number(id || 0);
  const x = (n * 9301 + 49297) % 233280;
  const idx = x % 8; // 0..7 -> 4.0 .. 4.7
  return (4.0 + idx * 0.1).toFixed(1);
}

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export default function Property() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [avail, setAvail] = useState(1);

  useEffect(()=>{ (async()=>{
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/properties/${id}`, { credentials:'include' });
      const j = await res.json(); if (!res.ok) throw new Error(j?.error || res.statusText);
      setData(j.property || j); setAvail((j.property||j)?.is_available ? 1 : 0);
    } catch(e){ setErr(e.message); } finally { setLoading(false); }
  })(); }, [id]);

  const photos = useMemo(() => {
    const arr = Array.isArray(data?.photos) ? data.photos : (data?.thumbnailUrl ? [data.thumbnailUrl] : []);
    return arr.map(u => (u && String(u).startsWith('/') ? `${API_BASE}${u}` : u));
  }, [data]);

  const normalizedAmenities = useMemo(() => {
    const AMENITY_LABELS = {
      wifi: 'Wi‑Fi',
      wi_fi: 'Wi‑Fi',
      'wi-fi': 'Wi‑Fi',
      kitchen: 'Kitchen',
      tv: 'TV',
      television: 'TV',
      ac: 'Air conditioning',
      air_conditioning: 'Air conditioning',
      'air conditioning': 'Air conditioning',
      pool: 'Pool',
      swimming_pool: 'Pool',
      'swimming pool': 'Pool',
      pet_friendly: 'Pets allowed',
      pets_allowed: 'Pets allowed',
      'pets allowed': 'Pets allowed',
      'pet-friendly': 'Pets allowed',
    };
    const toKey = (s) => String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const canon = (s) => {
      const k = toKey(s);
      if (k === 'air_conditioning') return 'ac';
      if (k === 'wi_fi') return 'wifi';
      if (k === 'television') return 'tv';
      if (k === 'swimming_pool') return 'pool';
      if (k === 'pets_allowed' || k === 'pet_friendly') return 'pet_friendly';
      return k;
    };
    const toLabel = (k) => AMENITY_LABELS[k] ||
      toKey(k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const a = data?.amenities;
    if (!a) return [];
    // if string JSON, try parse
    let arr = a;
    if (typeof a === 'string') { try { arr = JSON.parse(a); } catch { arr = a; } }
    const out = [];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string') out.push(toLabel(canon(item)));
        else if (item && typeof item === 'object') {
          const s = item.key || item.label || '';
          if (s) out.push(toLabel(canon(s)));
        }
      }
    } else if (arr && typeof arr === 'object') {
      for (const [k, v] of Object.entries(arr)) {
        if (v) out.push(toLabel(canon(k)));
      }
    }
    return Array.from(new Set(out));
  }, [data]);

  if (loading) return <div className="p-4">Loading…</div>;
  if (err) return <div className="p-4" style={{color:'crimson'}}>Failed to load: {err}</div>;
  if (!data) return <div className="p-4">Not found. <Link to="/">Back</Link></div>;

  const price = data.price_per_night ?? data.price ?? 0;
  const rating = ratingFromId(id);

  return (
    <div className="container py-6">
      <Link to="/" className="text-sm underline">← Back to results</Link>
      <div className="flex items-center gap-3 mt-1">
        <h2 className="text-2xl font-semibold">{data.title || data.name || 'Property'}</h2>
        <div className="flex items-center gap-1 text-gray-800">
          <span className="text-yellow-500">★</span>
          <span className="font-medium">{rating}</span>
        </div>
      </div>
      <div className="mt-1 text-sm text-gray-700">
        Hosted by {data?.owner?.first_name || 'Host'}
      </div>

      {photos.length > 0 && (
        (()=>{
          const count = photos.length;
          if (count === 1) {
            return (
              <div className="mt-3 rounded-2xl overflow-hidden">
                <img src={photos[0]} alt="" className="w-full h-[520px] object-cover" />
              </div>
            );
          }
          if (count < 5) {
            return (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
                {photos.slice(0,4).map((src,i)=>(
                  <img key={i} src={src} alt="" className="w-full h-[260px] md:h-[220px] object-cover" />
                ))}
              </div>
            );
          }
          return (
            <div className="mt-3 grid grid-cols-4 grid-rows-2 gap-2 rounded-2xl overflow-hidden">
              <img src={photos[0]} alt="" className="col-span-2 row-span-2 w-full h-full object-cover" />
              {photos.slice(1,5).map((src,i)=>(<img key={i} src={src} alt="" className="w-full h-full object-cover" />))}
            </div>
          );
        })()
      )}

      <div className="max-w-7xl mx-auto px-0 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start mt-6">
        <div className="lg:col-span-2">
          <div className="mt-4 rounded-2xl border border-gray-200 p-4">
            <div className="text-lg font-semibold mb-1">About this place</div>
            {(()=>{
              const city = data.location_city || data.city || '';
              const state = data.location_state || '';
              const country = data.country || '';
              const loc = [city, state, country].filter(Boolean).join(', ');
              let desc = data.description || '';
              if (desc && (city || loc)) {
                const cityOnly = city || '';
                if (cityOnly) {
                  desc = desc.replace(/in the heart of[^.,]*/i, `in the heart of ${cityOnly}`);
                }
                // Replace "City, Country" or "City, State, Country" with just "City"
                desc = desc.replace(/\b([A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*)\s*,\s*[A-Z][A-Za-z]+(?:\s*[A-Za-z]+)*(?:\s*,\s*[A-Z][A-Za-z]+(?:\s*[A-Za-z]+)*)?/g, '$1');
                // Remove leading property type tokens like "Condo • ", "Studio • "
                desc = desc.replace(/^(Studio|Condo|Apartment|House|Villa|Loft|Cottage|Bungalow|Townhouse|Cabin|Suite)\s*•\s*/i, '');
              }
              return (<p className="m-0 text-gray-800">{desc || 'No description provided.'}</p>);
            })()}
          </div>
          <div className="mt-4 rounded-2xl border border-gray-200 p-4">
            <div className="text-lg font-semibold mb-2">{data.type ? String(data.type).charAt(0).toUpperCase()+String(data.type).slice(1) : 'Home'}</div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">👤 Guests {data.capacity ?? 2}</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">🛏️ Bedrooms {data.bedrooms ?? 1}</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100">🛁 Bathrooms {data.bathrooms ?? 1}</span>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-gray-200 p-4 text-sm">
            <div className="text-lg font-semibold mb-1">What this place offers</div>
            {normalizedAmenities.length ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-800">
                {normalizedAmenities.map((label,i)=>(<li key={i} className="flex items-center gap-2">✔️<span>{label}</span></li>))}
              </ul>
            ) : (<div className="text-gray-700">No amenities listed.</div>)}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="shadow floating rounded-2xl p-0 border border-gray-200">
            <div className="rounded-t-2xl px-6 pt-4">
              <div className="text-xl font-semibold">{price ? `$${price}` : '—'} <span className="text-gray-600 text-base font-medium">/night</span></div>
              {avail === 1 ? (
                <div className="mt-1 text-sm text-green-700 bg-green-50 inline-flex items-center gap-1 px-2 py-0.5 rounded">● Available</div>
              ) : (
                <div className="mt-1 text-sm text-red-700 bg-red-50 inline-flex items-center gap-1 px-2 py-0.5 rounded">● Not available</div>
              )}
            </div>
            {avail === 1 ? (
              <BookNowForm propertyId={Number(id)} capacity={data.capacity ?? 10} unitPrice={price} onSuccess={()=>{}} />
            ) : (
              <div className="px-6 pb-6 text-sm text-gray-600">This listing is currently not accepting bookings.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
