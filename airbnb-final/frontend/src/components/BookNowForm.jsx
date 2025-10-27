import React, { useEffect, useMemo, useState } from 'react';
import { createBooking, checkAvailability, getPropertyAcceptedBookings } from '../api/bookings';
import Modal from './Modal';
import AirbnbStyleRangePicker from './DateRange/AirbnbStyleRangePicker.jsx';
import { useToast } from '../components/Toast';

export default function BookNowForm({ propertyId, capacity = 10, onSuccess, defaultStartDate = '', defaultEndDate = '', defaultGuests = 1, unitPrice = 0 }) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate]     = useState(defaultEndDate);
  const [guestsText, setGuestsText] = useState(String(defaultGuests || 1));
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [busyDays, setBusyDays]   = useState([]);
  const [showCal, setShowCal]     = useState(false);
  const toast = useToast();

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000*60*60*24)));
  }, [startDate, endDate]);
  const total = nights > 0 && unitPrice > 0 ? (nights * Number(unitPrice || 0)) : 0;

  useEffect(() => { (async()=>{
    try { const res = await getPropertyAcceptedBookings(propertyId); setBusyDays(res.bookings || []); } catch {}
  })(); }, [propertyId]);

  const clampGuests = (raw) => {
    let v = parseInt(raw, 10);
    if (Number.isNaN(v)) v = 1;
    if (v < 1) v = 1;
    const cap = Number(capacity || 0);
    if (cap > 0 && v > cap) v = cap;
    return v;
  };

  const validate = (g) => {
    if (!startDate || !endDate) return 'Please select start and end dates.';
    if (new Date(startDate) >= new Date(endDate)) return 'Start date must be before end date.';
    if (!Number.isInteger(g) || g < 1) return 'Guests must be a positive integer.';
    if (capacity && g > Number(capacity)) return `Guests exceed capacity (${capacity}).`;
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const g = clampGuests(guestsText);
    setGuestsText(String(g));
    const v = validate(g);
    if (v) { setError(v); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const avail = await checkAvailability({ propertyId, startDate, endDate });
      if (!avail?.available) { setError('Those dates overlap with an existing booking.'); setLoading(false); return; }
      const res = await createBooking({ propertyId, startDate, endDate, guests: g });
      setSuccess('Booking request sent!'); toast?.success?.('Reservation requested'); onSuccess?.(res.booking);
    } catch (err) { setError(err?.message || 'Failed to create booking.'); toast?.error?.(err?.message || 'Failed to create booking.'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl p-4">
      <label className="text-xs mb-1 block">Dates</label>
      <div className="flex items-center gap-3 mb-3">
        <button type="button" className="text-sm px-4 py-2 rounded-full border bg-white w-40 h-10 flex items-center justify-center text-center" onClick={()=>setShowCal(true)}>{startDate || 'Check-in'}</button>
        <span className="text-gray-500 flex-shrink-0">→</span>
        <button type="button" className="text-sm px-4 py-2 rounded-full border bg-white w-40 h-10 flex items-center justify-center text-center" onClick={()=>setShowCal(true)}>{endDate || 'Check-out'}</button>
      </div>

      <label className="text-xs mb-1 block">Guests</label>
      <input
        type="number"
        min={1}
        max={capacity || undefined}
        value={guestsText}
        onChange={(e)=>{ setGuestsText(e.target.value); }}
        onBlur={()=>{ const v = clampGuests(guestsText); setGuestsText(String(v)); }}
        className="w-full border border-gray-300 rounded-lg p-2 mb-1"
      />
      {capacity ? (<div className="text-[11px] text-gray-500 mb-3">Maximum {capacity} guests</div>) : null}

      {error && <div className="text-red-700 text-xs mb-2">{error}</div>}
      {success && <div className="text-emerald-700 text-xs mb-2">{success}</div>}

      {nights > 0 && total > 0 && (
        <div className="mb-2 text-sm text-gray-800 font-semibold">
          Total before taxes: ${total.toFixed(2)}<span className="text-gray-600 font-normal"> ({nights} night{nights>1?'s':''} × ${Number(unitPrice||0).toFixed(2)})</span>
        </div>
      )}

      <button type="submit" disabled={loading} className={`w-full rounded-full px-4 py-3 font-semibold ${loading? 'opacity-60' : ''}`} style={{ background: '#ff385c', color: '#fff' }}>{loading ? 'Booking…' : 'Book Now'}</button>
      <p className="text-[11px] text-gray-500 mt-2">You won’t be charged yet.</p>

      <Modal isOpen={showCal} onClose={()=>setShowCal(false)}>
        <div className="max-w-3xl">
          <div className="text-lg font-semibold mb-3">Select your dates</div>
          <AirbnbStyleRangePicker
            bookings={busyDays}
            initialMonth={new Date()}
            value={{ startDate: startDate || null, endDate: endDate || null }}
            onChange={({ startDate: s, endDate: e })=>{ const toY=(d)=>{ if(!d) return ''; const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;}; setStartDate(s? toY(s):''); setEndDate(e? toY(e):''); }}
          />
          <div className="mt-4 flex items-center justify-between">
            <button type="button" className="px-3 py-2 rounded-full border" onClick={()=>{ setStartDate(''); setEndDate(''); }}>Clear</button>
            <button type="button" className="px-3 py-2 rounded-full border" onClick={()=>setShowCal(false)}>Close</button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

