// src/api/properties.js
import { apiGet } from "./client";
const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

/** Real API (unwraps the backend's { properties } / { property } shape) */
export const propertiesApi = {
  getProperties: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.city) qs.set('city', params.city);
    if (params.guests) qs.set('guests', String(params.guests));
    if (params.page) qs.set('page', String(params.page));
    if (params.page_size) qs.set('page_size', String(params.page_size));
    if (params.sort) qs.set('sort', params.sort);
    const url = `/properties${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await apiGet(url);
    return res; // { properties, total }
  },
  update: async (id, body) => {
    const res = await fetch(`${BASE}/properties/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`);
    return res.json();
  },
  getPropertyById: async (id) => {
    const res = await apiGet(`/properties/${id}`);
    return res?.property ?? res;
  },
  uploadPhoto: async (propertyId, file) => {
    const form = new FormData(); form.append('photo', file);
    const res = await fetch(`${BASE}/properties/owner/${propertyId}/photos`, { method:'POST', credentials:'include', body: form });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`); return res.json();
  },
  setAvailability: async (id, isAvailable) => {
    const res = await fetch(`${BASE}/properties/${id}/availability`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !!isAvailable })
    });
    if (!res.ok) throw new Error(`Update failed (${res.status})`); return res.json();
  },
  remove: async (id) => {
    const res = await fetch(`${BASE}/properties/${id}`, { method: 'DELETE', credentials:'include' });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    return res.json();
  },
};

/** --- Optional mocks you can keep for local/offline dev --- */
export const getMockProperties = () => apiGet("/properties", { mock: true });

export const getMockPropertyById = async (id) => {
  try {
    return await apiGet(`/properties/${id}`, { mock: true });
  } catch {
    const list = await getMockProperties();
    return list.find(
      (p) => String(p.id) === String(id) || String(p._id) === String(id)
    );
  }
};
