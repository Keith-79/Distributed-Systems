import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../../api/client';
import { getCountries, getUSStates, getAmenitiesCatalog } from '../../api/meta';
import { propertiesApi } from '../../api/properties';
import { getOwnerBookings, setBookingStatus } from '../../api/bookings';
import { useToast } from '../../components/Toast';
import PropertyCard from '../../components/PropertyCard';

export default function OwnerDashboardPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name:'', type:'apartment', location_city:'', country:'US', price_per_night:'', capacity:'2', description:'', amenities: [], is_available: 1 });
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [tab, setTab] = useState('mine'); // mine | new | requests | history
  const [bookings, setBookings] = useState([]);
  const toast = useToast();

  useEffect(()=>{ (async()=>{ try{ setLoading(true); const res = await request('/properties/me/mine'); setRows(res.properties||[]);} finally{ setLoading(false);} })(); },[]);
  useEffect(()=>{ (async()=>{ try{ setCountries(await getCountries()); setStates(await getUSStates()); setAmenities(await getAmenitiesCatalog()); } catch{} })(); },[]);
  useEffect(()=>{ (async()=>{ try { const res = await getOwnerBookings(); setBookings(res.bookings || []); } catch {} })(); },[]);

  const byStatus = (status) => (bookings || []).filter(b => String(b.status).toUpperCase() === status);
  const pending = byStatus('PENDING');
  const accepted = byStatus('ACCEPTED');
  const cancelled = byStatus('CANCELLED');

  const onStatus = async (bookingId, next) => {
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status: next } : b));
    try {
      await setBookingStatus(bookingId, next);
      toast?.success?.(`Booking ${next.toLowerCase()}`);
    } catch (e) {
      toast?.error?.(e?.message || 'Failed to update');
      // rollback
      setBookings(await (async()=>{ try { const res = await getOwnerBookings(); return res.bookings || []; } catch { return bookings; } })());
    }
  };

  const toProp = (b) => ({
    id: b.property_id,
    name: b.property_name,
    location_city: b.city,
    country: b.country,
    thumbnailUrl: b.thumbnailUrl,
    price_per_night: b.price_per_night,
  });

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-semibold mb-2">Owner Dashboard</h2>
      <div className="mb-4 flex gap-2 flex-wrap">
        <button className={`px-3 py-1 rounded-full border ${tab==='mine'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('mine')}>My Properties</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='new'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('new')}>New Property</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='requests'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('requests')}>Booking Requests</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='history'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('history')}>Booking History</button>
      </div>

      {tab==='new' && (
      <div className="border border-gray-200 rounded-2xl p-4">
        <h3 className="text-lg font-semibold mb-2">Add New Property</h3>
        <form onSubmit={async (e)=>{ e.preventDefault(); try { const res = await request('/properties', { method:'POST', body: form }); const created = res?.property || res; if (created?.id && photoFile) await propertiesApi.uploadPhoto(created.id, photoFile); const mine = await request('/properties/me/mine'); setRows(mine.properties||[]); setPhotoFile(null); setForm({ name:'', type:'apartment', location_city:'', country:'US', price_per_night:'', capacity:'2', description:'', amenities: [], is_available: 1 }); } catch {} }} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Title<input className="block w-full border border-gray-300 rounded-lg p-2" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></label>
          <label className="text-sm">Type<select className="block w-full border border-gray-300 rounded-lg p-2" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="studio">Studio</option></select></label>
          <label className="text-sm">City<input className="block w-full border border-gray-300 rounded-lg p-2" value={form.location_city} onChange={e=>setForm({...form, location_city:e.target.value})}/></label>
          <label className="text-sm">Country<select className="block w-full border border-gray-300 rounded-lg p-2" value={form.country} onChange={e=>setForm({...form, country:e.target.value})}>{countries.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}</select></label>
          <label className="text-sm">Price per night<input type="number" className="block w-full border border-gray-300 rounded-lg p-2" value={form.price_per_night} onChange={e=>setForm({...form, price_per_night:e.target.value})}/></label>
          <label className="text-sm">Capacity<input type="number" className="block w-full border border-gray-300 rounded-lg p-2" value={form.capacity} onChange={e=>setForm({...form, capacity:e.target.value})}/></label>
          <label className="text-sm">Cover photo<input type="file" accept="image/*" className="block w-full border border-gray-300 rounded-lg p-2" onChange={(e)=>setPhotoFile(e.target.files?.[0] || null)} /></label>
          <label className="text-sm sm:col-span-2">Description<textarea className="block w-full border border-gray-300 rounded-lg p-2" rows={4} value={form.description} onChange={e=>setForm({...form, description:e.target.value})}/></label>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold mb-1">Amenities</legend><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{(amenities.length? amenities : [ {key:'wifi',label:'Wifi'},{key:'kitchen',label:'Kitchen'},{key:'tv',label:'TV'},{key:'ac',label:'Air conditioning'},{key:'pool',label:'Pool'},{key:'pet_friendly',label:'Pets allowed'}, ])
            .filter(a=>['wifi','kitchen','tv','ac','pool','pet_friendly'].includes(a.key))
            .map(a=>(<label key={a.key} className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={form.amenities.includes(a.key)} onChange={(e)=>{ const checked=e.target.checked; setForm(f=>({...f, amenities: checked? [...new Set([...(f.amenities||[]), a.key])]: (f.amenities||[]).filter(k=>k!==a.key)})); }} /> {a.label}</label>))}</div></fieldset>
          <label className="text-sm">Available<select className="block w-full border border-gray-300 rounded-lg p-2" value={form.is_available} onChange={e=>setForm({...form, is_available: Number(e.target.value)})}><option value={1}>Available</option><option value={0}>Not available</option></select></label>
          <div className="sm:col-span-2"><button type="submit" className="rounded-full px-4 py-2 border text-white" style={{ background:'#FF385C', borderColor:'#FF385C' }}>Create</button></div>
        </form>
      </div>
      )}

      {tab==='mine' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">My Properties</h3>
          {loading ? (<div>Loading…</div>) : rows.length===0 ? (<div className="text-sm text-gray-600">No properties yet.</div>) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(p=> (
                <div key={p.id} className="space-y-2">
                  <PropertyCard property={{ id:p.id, name:p.name, title:p.name, location_city:p.location_city, country:p.country, thumbnailUrl:p.thumbnailUrl, price_per_night:p.price_per_night }} badge="Owned by you" />
                  <div className="flex items-center gap-2">
                    <Link to={`/property/${p.id}`} className="px-3 py-1 rounded-full border">Open</Link>
                    <button className="px-3 py-1 rounded-full border" onClick={async()=>{ const next = p.is_available? 0: 1; try { await propertiesApi.setAvailability(p.id, next); setRows(rs => rs.map(r=> r.id===p.id? { ...r, is_available: next }: r)); } catch {} }}> {p.is_available? 'Set Unavailable':'Set Available'} </button>
                    <button className="px-3 py-1 rounded-full border border-red-600 text-red-700" onClick={async()=>{ if (!window.confirm('Remove this property?')) return; try { await propertiesApi.remove(p.id); setRows(rs => rs.filter(r=>r.id!==p.id)); } catch {} }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='requests' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Incoming booking requests</h3>
          {pending.length === 0 ? (
            <div className="text-sm text-gray-600">No pending requests.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map(b => (
                <div key={b.id} className="space-y-2">
                  <PropertyCard property={toProp(b)} />
                  <div className="flex items-center gap-2">
                    <Link to={`/property/${b.property_id}`} className="px-3 py-1 rounded-full border">Open</Link>
                    <button className="px-3 py-1 rounded-full text-white" style={{ background:'#FF385C' }} onClick={()=>onStatus(b.id, 'ACCEPTED')}>Accept</button>
                    <button className="px-3 py-1 rounded-full border" onClick={()=>onStatus(b.id, 'CANCELLED')}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab==='history' && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Accepted</h3>
          {accepted.length === 0 ? (<div className="text-sm text-gray-600">No accepted bookings.</div>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accepted.map(b => (
                <div key={b.id} className="space-y-2">
                  <PropertyCard property={toProp(b)} />
                  <div className="flex items-center gap-2">
                    <Link to={`/property/${b.property_id}`} className="px-3 py-1 rounded-full border">Open</Link>
                    <button className="px-3 py-1 rounded-full border" onClick={()=>onStatus(b.id, 'CANCELLED')}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-lg font-semibold mt-6 mb-3">Cancelled</h3>
          {cancelled.length === 0 ? (<div className="text-sm text-gray-600">No cancelled bookings.</div>) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cancelled.map(b => (
                <div key={b.id} className="space-y-2">
                  <PropertyCard property={toProp(b)} />
                  <div className="text-sm text-gray-600">{b.start_date} → {b.end_date} · {b.guests} guests</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
