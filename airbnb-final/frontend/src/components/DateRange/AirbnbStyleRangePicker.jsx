import React, { useEffect, useMemo, useState } from 'react';

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function parseLocalYmd(v){
  if (!v) return null;
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function AirbnbStyleRangePicker({ bookings = [], initialMonth = new Date(), value, onChange }){
  const [month, setMonth] = useState(startOfMonth(initialMonth));
  const [start, setStart] = useState(value?.startDate ? parseLocalYmd(value.startDate) : null);
  const [end, setEnd] = useState(value?.endDate ? parseLocalYmd(value.endDate) : null);
  const [hover, setHover] = useState(null);

  // Keep internal selection in sync with external controlled value
  useEffect(() => {
    const vs = value?.startDate ? parseLocalYmd(value.startDate) : null;
    const ve = value?.endDate ? parseLocalYmd(value.endDate) : null;
    const changed = (+vs || 0) !== (+start || 0) || (+ve || 0) !== (+end || 0);
    if (changed) {
      setStart(vs);
      setEnd(ve);
      setHover(null);
    }
  }, [value?.startDate, value?.endDate]);

  const ranges = useMemo(() => (bookings||[])
    .map(b => ({ start: startOfDay(parseLocalYmd(b.start || b.start_date)), end: startOfDay(parseLocalYmd(b.end || b.end_date)) }))
    .filter(r => +r.start < +r.end)
  , [bookings]);

  function isBooked(date){
    const t = +startOfDay(date);
    return ranges.some(r => !(+startOfDay(r.end) <= t || +startOfDay(r.start) > t));
  }

  const months = useMemo(()=>[month, addMonths(month,1)], [month.getFullYear(), month.getMonth()]);

  function buildCells(m){
    const s = startOfMonth(m); const e = endOfMonth(m);
    const first = s.getDay();
    const cells = Array.from({length:first}, ()=>null);
    for (let d=1; d<=e.getDate(); d++) cells.push(new Date(m.getFullYear(), m.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function onPick(d){
    if (!d) return;
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (!start || (start && end)) { setStart(d0); setEnd(null); setHover(null); onChange?.({ startDate: d0, endDate: null }); return; }
    if (+d0 <= +start){ setStart(d0); setEnd(null); setHover(null); onChange?.({ startDate: d0, endDate: null }); return; }
    setEnd(d0); onChange?.({ startDate: start, endDate: d0 });
  }

  return (
    <div className="w-full relative bg-white">
      <div className="flex items-center justify-between mb-3 relative z-10">
        <button type="button" className="px-2 py-1 rounded border z-10" onClick={()=>setMonth(addMonths(month,-1))}>←</button>
        <div />
        <button type="button" className="px-2 py-1 rounded border z-10" onClick={()=>setMonth(addMonths(month,1))}>→</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-[560px]">
        {months.map((m, idx)=> (
          <div key={idx}>
            <div className="text-sm font-medium mb-2 text-center">{m.toLocaleString(undefined,{ month:'long', year:'numeric' })}</div>
            <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-gray-600 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(<div key={d}>{d}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {buildCells(m).map((d,i)=>{
                const disabled = !d || isBooked(d);
                const isStart = start && d && +startOfDay(start) === +startOfDay(d);
                const isEnd = end && d && +startOfDay(end) === +startOfDay(d);
                const inRange = start && end && d && +d > +start && +d < +end && !disabled;
                const hovered = !end && start && hover && d && +d > +start && +d <= +hover && !isBooked(d);
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={disabled}
                    onMouseEnter={()=>{ if (start && !end && d && +d > +start) setHover(new Date(d)); }}
                    onMouseLeave={()=>setHover(null)}
                    onClick={()=>onPick(d)}
                    className={`h-10 rounded text-sm ${!d? 'opacity-0' : disabled? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-100'} ${inRange? 'bg-[#FF385C]/20' : ''} ${hovered ? 'bg-pink-50' : ''} ${(isStart||isEnd)? 'ring-2 ring-[#FF385C]' : ''}`}
                  >{d? d.getDate(): ''}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


