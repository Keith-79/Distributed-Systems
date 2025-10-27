import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();

  const onLogout = async () => { const { ok } = await logout(); if (ok) nav('/'); };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-3 grid grid-cols-[1fr_auto_1fr] items-center">
        <div className="justify-self-start">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-extrabold text-xl" onClick={(e)=>{ e.preventDefault(); nav('/'); }}>
            <img src={(process.env.PUBLIC_URL || '') + '/airbnb_logo.png'} alt="Airbnb" className="w-6 h-6" />
            <span>Airbnb</span>
          </Link>
        </div>

        {/* Center spacer (removed Homes tab) */}
        <div className="hidden md:block justify-self-center" />

        <div className="justify-self-end flex items-center gap-2">
          {user && (
            <div className="hidden md:flex items-center gap-2 mr-2 text-sm text-gray-600">
              <span className="inline-flex items-center h-9 px-3 rounded-full bg-gray-100">{user.role === 'owner' ? 'Owner' : 'Traveler'}</span>
              {user.role === 'owner' && (
                <NavLink to="/owner/dashboard" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Owner dashboard</NavLink>
              )}
              {user.role !== 'owner' && (
                <>
                  <NavLink to="/favorites" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>My Favorites</NavLink>
                  <NavLink to="/bookings" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>My Trips</NavLink>
                </>
              )}
            </div>
          )}
          {loading ? null : user ? (
            <div className="flex items-center gap-2">
              <NavLink to="/profile" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>{user.name?.split(' ')?.[0] ? `Hi, ${user.name.split(' ')[0]}` : (user.firstName ? `Hi, ${user.firstName}` : user.email)}</NavLink>
              <button onClick={onLogout} className="inline-flex items-center h-9 px-3 rounded-full border border-gray-900 bg-gray-900 text-white text-sm font-semibold">Log out</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Log in</NavLink>
              <NavLink to="/signup" className={({isActive})=>`inline-flex items-center h-9 px-3 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Sign up</NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
