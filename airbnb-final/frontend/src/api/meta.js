const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
async function jfetch(p){ const r = await fetch(`${BASE}${p}`, { credentials:'include' }); const j = await r.json(); if (!r.ok) throw new Error(j?.error||'HTTP'); return j; }
export const getCountries = async () => (await jfetch('/meta/countries'))?.countries || [];
export const getUSStates = async () => (await jfetch('/meta/us-states'))?.states || [];
export const getAmenitiesCatalog = async () => (await jfetch('/meta/amenities'))?.amenities || [];



