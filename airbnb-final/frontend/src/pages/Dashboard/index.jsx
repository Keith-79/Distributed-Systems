import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { propertiesApi } from "../../api/properties";
import PropertyCard from "../../components/PropertyCard";
import SearchBar from "../../components/SearchBar";

export default function Dashboard() {
  const [sp] = useSearchParams();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const page = Number(sp.get('page') || 1);
  const q = sp.get('city') || sp.get('q') || '';
  const guests = Number(sp.get('guests') || 0) || undefined;

  useEffect(()=>{
    (async()=>{
      try {
        setLoading(true); setError(null);
        const res = await propertiesApi.getProperties({ city: q || undefined, guests, page, page_size: 20 });
        const list = (res.properties || []).filter(p => !guests || Number(p.capacity || 0) >= guests);
        setData(list);
        setTotal(res.total != null ? res.total : list.length);
      } catch(e){ setError(e); }
      finally { setLoading(false); }
    })();
  }, [q, guests, page]);

  const pages = Math.min(5, Math.max(1, Math.ceil((total || 0)/20)));

  return (
    <div>
      <h2 className="text-xl font-semibold">Explore stays</h2>
      <SearchBar />
      {loading && <div className="mt-4">Loading properties…</div>}
      {error && <div className="mt-4 text-red-700">Failed to load: {error.message}</div>}
      {!loading && !error && (!data || data.length === 0) && (
        <div className="mt-4 text-gray-700">No properties found.</div>
      )}
      {!loading && !error && data && data.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {data.map((p) => (
            <PropertyCard key={p.id || p._id} property={p} />
          ))}
        </div>
      )}
      {!loading && pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_,i)=> i+1).map(n => (
            <a key={n} href={`/?${new URLSearchParams({ ...(q?{city:q}:{}) , page:String(n) }).toString()}`} className={`px-3 py-1 rounded-full border ${n===page? 'bg-gray-900 text-white':''}`}>{n}</a>
          ))}
        </div>
      )}
      {/* Agent FAB removed; AgentWidget button is used globally */}
    </div>
  );
}
