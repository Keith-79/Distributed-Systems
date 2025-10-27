import React, { useEffect, useMemo, useState } from 'react';
import { getMyBookings } from '../../api/bookings';
import PropertyCard from '../../components/PropertyCard';

function toYmd(s){
  if (!s) return '';
  // Accept 'YYYY-MM-DD' or ISO; prefer the first 10 chars when ISO
  const str = String(s);
  if (str.length >= 10) return str.slice(0,10);
  try { const d = new Date(str); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${mm}-${dd}`; } catch { return str; }
}

function Section({ title, items }){
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">No bookings.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(b => (
            <div key={b.id} className="space-y-2">
              <PropertyCard property={{ id:b.property_id, name:b.property_name, title:b.property_name, location_city:b.city, country:b.country, thumbnailUrl:b.thumbnailUrl, price_per_night:b.price_per_night, isFavourited: false }} />
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">{toYmd(b.start_date)} → {toYmd(b.end_date)}</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">{b.guests} {b.guests>1?'guests':'guest'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripsPage(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('accepted'); // accepted | pending | cancelled | history

  useEffect(()=>{ (async()=>{ try { setLoading(true); const res = await getMyBookings(); setRows(res.bookings || []); } catch(e){ setError(e); } finally { setLoading(false);} })(); },[]);

  const todayYmd = useMemo(()=>{
    const d = new Date();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }, []);

  const accepted = rows.filter(b => String(b.status).toUpperCase()==='ACCEPTED' && b.start_date >= todayYmd);
  const pending  = rows.filter(b => String(b.status).toUpperCase()==='PENDING');
  const cancelled= rows.filter(b => String(b.status).toUpperCase()==='CANCELLED');
  const history  = rows.filter(b => String(b.status).toUpperCase()==='ACCEPTED' && b.end_date < todayYmd);

  return (
    <div className="container py-6">
      <h2 className="text-2xl font-semibold mb-3">My Trips</h2>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <button className={`px-3 py-1 rounded-full border ${tab==='accepted'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('accepted')}>Accepted</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='pending'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('pending')}>Pending</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='cancelled'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('cancelled')}>Cancelled</button>
        <button className={`px-3 py-1 rounded-full border ${tab==='history'?'bg-gray-900 text-white':''}`} onClick={()=>setTab('history')}>History</button>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{color:'crimson'}}>Failed to load trips.</div>}
      {!loading && !error && (
        <>
          {tab==='accepted' && <Section title="Accepted trips" items={accepted} />}
          {tab==='pending'  && <Section title="Pending trips" items={pending} />}
          {tab==='cancelled'&& <Section title="Cancelled trips" items={cancelled} />}
          {tab==='history'  && <Section title="Trip history" items={history} />}
        </>
      )}
    </div>
  );
}
