const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

export const favouritesApi = {
  async toggle(propertyId) {
    const res = await fetch(`${API_BASE}/favourites/${propertyId}/toggle`, {
      method: 'POST',
      credentials: 'include',
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(data?.error || data?.message || 'Failed to toggle favourite');
      err.status = res.status;
      throw err;
    }
    return data || {};
  },
  async listMine() {
    const res = await fetch(`${API_BASE}/favourites/my`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load favourites');
    return res.json();
  },
  async exists(propertyId) {
    const res = await fetch(`${API_BASE}/favourites/exists/${propertyId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to check favourite');
    return res.json();
  },
};

