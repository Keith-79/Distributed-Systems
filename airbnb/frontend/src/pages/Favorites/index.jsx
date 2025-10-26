import React, { useEffect, useState } from 'react';
import { favouritesApi } from '../../api/favourites';
import PropertyCard from '../../components/PropertyCard';

export default function FavoritesPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{ (async()=>{ try { setLoading(true); const res = await favouritesApi.listMine(); setRows(res.favourites || []); } catch(e){ setError(e); } finally { setLoading(false); } })(); },[]);

  if (loading) return <div className="container py-6">Loading…</div>;
  if (error) return <div className="container py-6" style={{color:'crimson'}}>Failed to load favorites.</div>;

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-semibold mb-3">My Favorites</h2>
      {(!rows || rows.length===0) ? (
        <div className="text-sm text-gray-600">You have no favorites yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rows.map((r)=> (
            <PropertyCard key={r.property_id} property={{ id:r.property_id, name:r.name, title:r.name, location_city:r.location_city, country:r.country, thumbnailUrl:r.thumbnailUrl, price_per_night:r.price_per_night, isFavourited:true }} />
          ))}
        </div>
      )}
    </div>
  );
}
