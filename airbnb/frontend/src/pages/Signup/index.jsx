import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SignupPage(){
  const { signup, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('traveler');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault(); setError('');
    const res = await signup({ name, email, password, role });
    if (res?.ok) {
      nav('/', { replace: true });
    } else {
      setError(res?.error || 'Signup failed');
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <h2 className="text-2xl font-semibold mb-4">Create account</h2>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="text-sm">Full name<input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2" required /></label>
        <label className="text-sm">Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2" required /></label>
        <label className="text-sm">Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2" required /></label>
        <label className="text-sm">Role<select value={role} onChange={(e)=>setRole(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2"><option value="traveler">Traveler</option><option value="owner">Owner</option></select></label>
        {error && <div className="text-red-700 text-sm">{error}</div>}
        <button type="submit" disabled={loading} className="rounded-full px-4 py-2 text-white" style={{ background:'#FF385C' }}>{loading? 'Creating…' : 'Sign up'}</button>
      </form>
      <div className="text-sm text-gray-600 mt-3">Already have an account? <Link to="/login" className="underline">Log in</Link></div>
    </div>
  );
}
