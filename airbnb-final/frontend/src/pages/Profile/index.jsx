import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { request } from '../../api/client';
import { getCountries, getUSStates } from '../../api/meta';
import { useToast } from '../../components/Toast';

export default function ProfilePage(){
  const { user } = useAuth();
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);
  const API = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
  const firstName = user?.name?.split(' ')?.[0] || user?.firstName || user?.email?.split('@')?.[0] || 'Traveler';
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const toast = useToast();

  useEffect(()=>{ (async()=>{ try { const me = await request('/profile/me'); if (me?.profile) setProfile(me.profile); } catch {} })(); }, []);
  useEffect(()=>{ (async()=>{ try { setCountries(await getCountries()); setStates(await getUSStates()); } catch {} })(); }, []);

  async function uploadAvatar(file){ if (!file) return; const fd = new FormData(); fd.append('avatar', file); const res = await fetch(`${API}/profile/avatar`, { method:'POST', credentials:'include', body: fd }); if (res.ok) { const me = await request('/profile/me'); if (me?.profile) setProfile(me.profile); toast?.success?.('Profile photo updated'); } else { toast?.error?.('Upload failed'); } }
  async function removeAvatar(){ const res = await fetch(`${API}/profile/avatar`, { method:'DELETE', credentials:'include' }); if (res.ok) { const me = await request('/profile/me'); if (me?.profile) setProfile(me.profile); toast?.info?.('Profile photo removed'); } else { toast?.error?.('Remove failed'); } }

  return (
    <div className="container max-w-3xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xl font-semibold text-gray-700">
          {profile.avatar_url ? (<img src={`${API}${profile.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />) : (<span>{String(firstName||'U').charAt(0).toUpperCase()}</span>)}
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Welcome, {firstName}</h2>
          <div className="text-gray-600 mt-1">{user?.email}</div>
        </div>
      </div>

      <section className="mt-2">
        <div className="rounded-2xl border border-gray-200 shadow-card bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>
          <form onSubmit={async (e)=>{ e.preventDefault(); setSaving(true); try { const payload = {
              phone: profile.phone || null,
              city: profile.city || null,
              state: profile.state || null,
              country: profile.country || null,
              languages: profile.languages || null,
              gender: profile.gender || null,
              about: profile.about || null,
            }; const res = await request('/profile/me', { method:'PUT', body: payload }); setProfile(res.profile || { ...profile, ...payload }); toast?.success?.('Profile updated'); } catch { toast?.error?.('Save failed'); } finally { setSaving(false); } }} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Avatar
              <div className="flex items-center gap-2">
                <input type="file" accept="image/*" className="block w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" onChange={(e)=>uploadAvatar(e.target.files?.[0])}/>
                {profile.avatar_url && (<button type="button" className="px-3 py-2 rounded-full border text-sm" onClick={removeAvatar}>Remove</button>)}
              </div>
            </label>
            <label className="text-sm">Phone
              <input value={profile.phone || ''} onChange={(e)=>setProfile({...profile, phone:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm">City
              <input value={profile.city || ''} onChange={(e)=>setProfile({...profile, city:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm">State
              <select value={profile.state || ''} onChange={(e)=>setProfile({...profile, state:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Select</option>
                {states.map(s => (<option key={s.name} value={s.name}>{s.name}</option>))}
              </select>
            </label>
            <label className="text-sm">Country
              <select value={profile.country || ''} onChange={(e)=>setProfile({...profile, country:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Select</option>
                {countries.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}
              </select>
            </label>
            <label className="text-sm">Languages
              <input value={profile.languages || ''} onChange={(e)=>setProfile({...profile, languages:e.target.value})} placeholder="e.g., English, Spanish" className="block w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <label className="text-sm">Gender
              <select value={profile.gender || ''} onChange={(e)=>setProfile({...profile, gender:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">About me
              <textarea rows={4} value={profile.about || ''} onChange={(e)=>setProfile({...profile, about:e.target.value})} className="block w-full border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </label>
            <div className="sm:col-span-2 pt-2"><button type="submit" disabled={saving} className={`rounded-full px-5 py-2.5 text-white shadow-card ${saving?'opacity-60':''}`} style={{ background:'#FF385C' }}>{saving? 'Saving…':'Save profile'}</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
