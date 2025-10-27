import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../Modal';
import AirbnbStyleRangePicker from '../DateRange/AirbnbStyleRangePicker.jsx';

export default function SearchBar(){
  const [params] = useSearchParams();
  const nav = useNavigate();

  const [city, setCity] = useState(params.get('city') || '');
  const [guests, setGuests] = useState(Number(params.get('guests') || 1));
  const [startDate, setStartDate] = useState(params.get('start_date') || '');
  const [endDate, setEndDate] = useState(params.get('end_date') || '');

  const [open, setOpen] = useState(null); // 'where' | 'when' | 'who' | null
  const [showCal, setShowCal] = useState(false);

  const wrapRef = useRef(null);
  useEffect(()=>{
    function onDoc(e){ if (!wrapRef.current) return; if (!wrapRef.current.contains(e.target)) setOpen(null); }
    document.addEventListener('mousedown', onDoc); return ()=>document.removeEventListener('mousedown', onDoc);
  }, []);

  // Sync local inputs when URL query changes (e.g., clicking the Airbnb logo)
  useEffect(()=>{
    setCity(params.get('city') || '');
    setGuests(Number(params.get('guests') || 1));
    setStartDate(params.get('start_date') || '');
    setEndDate(params.get('end_date') || '');
  }, [params]);

  const onApply = (opts = {}) => {
    const nextCity = Object.prototype.hasOwnProperty.call(opts,'city') ? (opts.city || '') : city;
    const nextStart = Object.prototype.hasOwnProperty.call(opts,'startDate') ? (opts.startDate || '') : startDate;
    const nextEnd = Object.prototype.hasOwnProperty.call(opts,'endDate') ? (opts.endDate || '') : endDate;
    const nextGuests = Object.prototype.hasOwnProperty.call(opts,'guests') ? (opts.guests || 1) : guests;

    const qs = new URLSearchParams();
    if (nextCity && String(nextCity).trim()) qs.set('city', String(nextCity).trim());
    if (nextStart) qs.set('start_date', nextStart);
    if (nextEnd) qs.set('end_date', nextEnd);
    if (nextGuests) qs.set('guests', String(nextGuests));
    const s = qs.toString();
    nav({ pathname: '/', search: s ? `?${s}` : '' });
    if (opts.close) setOpen(null);
  };

  const toLocalYmd = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const da = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  };

  return (
    <div className="sticky top-[64px] z-50" ref={wrapRef}>
      <div className="mx-auto mt-3 max-w-[900px] rounded-full bg-white shadow-md border border-gray-200 flex items-center divide-x divide-gray-200">
        <button className="flex-1 text-left px-4 py-3 hover:bg-gray-50 rounded-l-full" onClick={()=>setOpen(open==='where'? null : 'where')}>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Where</div>
          <div className="text-sm text-gray-900">{city || 'Search destinations'}</div>
        </button>
        <button className="flex-1 text-left px-4 py-3 hover:bg-gray-50" onClick={()=>{ setShowCal(true); setOpen('when'); }}>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">When</div>
          <div className="text-sm text-gray-900">{(startDate && endDate) ? `${startDate} → ${endDate}` : 'Add dates'}</div>
        </button>
        <button className="flex-1 text-left px-4 py-3 hover:bg-gray-50 rounded-r-full" onClick={()=>setOpen(open==='who'? null : 'who')}>
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Who</div>
          <div className="text-sm text-gray-900">{guests || 1} {((guests||1)>1)? 'guests':'guest'}</div>
        </button>
        <button className="mx-2 my-1 px-3 py-2 rounded-full text-white" style={{ background:'#FF385C' }} onClick={()=>onApply({ close: true })}>Search</button>
      </div>

      {open==='where' && (
        <div className="mx-auto max-w-[900px]">
          <div className="mt-2 bg-white rounded-2xl shadow-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-800">Select destination</div>
              <button aria-label="Clear destination" title="Clear" className="px-3 py-1 rounded-full border text-sm" onClick={()=>{ setCity(''); /* keep open; no apply */ }}>Clear</button>
            </div>
            <input
              value={city}
              onChange={(e)=>setCity(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ onApply({ city }); setOpen(null); } }}
              placeholder="City"
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1 rounded-full border" onClick={()=>setOpen(null)}>Close</button>
              <button className="px-3 py-1 rounded-full border bg-gray-900 text-white" onClick={()=>{ onApply({ city }); setOpen(null); }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {open==='who' && (
        <div className="mx-auto max-w-[900px]">
          <div className="mt-2 bg-white rounded-2xl shadow-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Number of guests</div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full border" onClick={()=>setGuests(Math.max(1, (guests||1)-1))}>-</button>
                <div className="w-6 text-center">{guests||1}</div>
                <button className="w-8 h-8 rounded-full border" onClick={()=>setGuests((guests||1)+1)}>+</button>
              </div>
            </div>
          <div className="mt-3 flex justify-end"><button className="px-3 py-1 rounded-full border" onClick={()=>{ onApply({ guests }); setOpen(null); }}>Done</button></div>
          </div>
        </div>
      )}

      <Modal isOpen={showCal} onClose={()=>setShowCal(false)}>
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Select dates</div>
          </div>
          <AirbnbStyleRangePicker
            value={{ startDate: startDate || null, endDate: endDate || null }}
            onChange={({ startDate: s, endDate: e })=>{ setStartDate(s? toLocalYmd(s):''); setEndDate(e? toLocalYmd(e):''); }}
          />
          <div className="mt-4 flex items-center justify-between">
            <button className="px-3 py-1 rounded-full border" onClick={()=>{ setStartDate(''); setEndDate(''); onApply({ startDate:'', endDate:'' }); }}>Clear</button>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-full border" onClick={()=>setShowCal(false)}>Close</button>
              <button className="px-3 py-1 rounded-full border bg-gray-900 text-white" onClick={()=>{ setShowCal(false); onApply({ startDate, endDate }); }}>Apply</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
