import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../api/auth";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const me = await authApi.me();
      const u = me?.user ?? me?.data?.user ?? (me && (me.email || me.id ? me : null)) ?? null;
      setUser(u);
      return u;
    } catch (e) {
      setUser(null);
      return null;
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      await authApi.login(email, password);
      const u = await fetchMe();
      return { ok: true, user: u };
    } catch (e) { return { ok: false, error: e.message }; }
    finally { setAuthLoading(false); }
  };

  const signup = async (payload) => {
    setAuthLoading(true);
    try {
      await authApi.signup(payload);
      const u = await fetchMe();
      return { ok: true, user: u };
    } catch (e) { return { ok: false, error: e.message }; }
    finally { setAuthLoading(false); }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
    finally { setAuthLoading(false); }
  };

  const value = { user, loading: bootLoading || authLoading, login, signup, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
