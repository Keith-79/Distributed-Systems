import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage(){
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();
  const { state } = useLocation();

  const onSubmit = async (e) => {
    e.preventDefault(); setError('');
    const res = await login(email, password);
    if (res?.ok) {
      const to = state?.from || '/';
      nav(to, { replace: true });
    } else {
      setError(res?.error || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h2 className="text-2xl font-semibold mb-4">Log in</h2>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="text-sm">Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2" required /></label>
        <label className="text-sm">Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2" required /></label>
        {error && <div className="text-red-700 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="rounded-full px-4 py-2 text-white" style={{ background:'#FF385C' }}>{loading? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="text-sm text-gray-600 mt-3">New here? <Link to="/signup" className="underline">Create an account</Link></div>
    </div>
  );
}
