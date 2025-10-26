const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

async function jfetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) { const msg = data?.error || data?.message || `HTTP ${res.status}`; const err = new Error(msg); err.status = res.status; err.payload = data; throw err; }
  return data || {};
}

export async function createBooking({ propertyId, startDate, endDate, guests = 1 }) {
  return jfetch('/bookings', {
    method: 'POST',
    body: JSON.stringify({ property_id: Number(propertyId), start_date: startDate, end_date: endDate, guests: Number(guests) })
  });
}

export async function checkAvailability({ propertyId, startDate, endDate }) {
  const qs = new URLSearchParams({ property_id: String(propertyId), start_date: startDate, end_date: endDate });
  return jfetch(`/bookings/check?${qs.toString()}`);
}

export async function getMyBookings() { return jfetch('/bookings/my', { method: 'GET' }); }
export async function getOwnerBookings() { return jfetch('/bookings/owner', { method: 'GET' }); }
export async function setBookingStatus(id, status) { return jfetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); }
export async function getPropertyAcceptedBookings(propertyId) { return jfetch(`/bookings/property/${propertyId}`, { method: 'GET' }); }
