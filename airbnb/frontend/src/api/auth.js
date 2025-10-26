const BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

async function jfetch(path, options = {}){
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', headers:{ 'Content-Type':'application/json', ...(options.headers||{}) }, ...options });
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) { const err = new Error(data?.error || data?.message || `HTTP ${res.status}`); err.status = res.status; throw err; }
  return data || {};
}

export const authApi = {
  async me(){ return jfetch('/auth/me', { method:'GET' }); },
  async login(email, password){ return jfetch('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }); },
  async signup(payload){ return jfetch('/auth/signup', { method:'POST', body: JSON.stringify(payload) }); },
  async logout(){ return jfetch('/auth/logout', { method:'POST' }); },
};
