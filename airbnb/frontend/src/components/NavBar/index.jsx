import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function NavBar() {
  const { user, logout, loading } = useAuth();
  const nav = useNavigate();

  const onLogout = async () => { const { ok } = await logout(); if (ok) nav('/'); };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center">
        <Link to="/" className="text-primary font-extrabold text-xl mr-4">Airbnb</Link>

        <nav className="hidden md:flex items-center gap-6 mx-auto">
          <NavLink to="/" className={({isActive})=>`text-sm font-medium pb-2 ${isActive ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>Homes</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <div className="hidden md:flex items-center gap-2 mr-2 text-sm text-gray-600">
              <span className="px-2 py-1 rounded-full bg-gray-100">{user.role === 'owner' ? 'Owner' : 'Traveler'}</span>
              {user.role === 'owner' && (
                <NavLink to="/owner/dashboard" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Owner dashboard</NavLink>
              )}
              {user.role !== 'owner' && (
                <>
                  <NavLink to="/favorites" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>My Favorites</NavLink>
                  <NavLink to="/bookings" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>My Trips</NavLink>
                </>
              )}
            </div>
          )}
          {loading ? null : user ? (
            <div className="flex items-center gap-2">
              <NavLink to="/profile" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>{user.name?.split(' ')?.[0] ? `Hi, ${user.name.split(' ')[0]}` : (user.firstName ? `Hi, ${user.firstName}` : user.email)}</NavLink>
              <button onClick={onLogout} className="px-3 py-2 rounded-full border border-gray-900 bg-gray-900 text-white text-sm font-semibold">Log out</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/login" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Log in</NavLink>
              <NavLink to="/signup" className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium ${isActive? 'border bg-white' : 'border border-transparent hover:border-gray-200'}`}>Sign up</NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
