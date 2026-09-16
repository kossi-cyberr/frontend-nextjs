"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken, setToken } from "./api";
import type { Utilisateur } from "./types";

interface AuthContextValue {
  user: Utilisateur | null;
  loading: boolean;
  roles: string[];
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<Utilisateur>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ accessToken: string }>("/auth/authentification", {
        method: "POST",
        body: { login: email, password },
        auth: false,
      });
      setToken(res.accessToken);
      const me = await api<Utilisateur>("/auth/me");
      setUser(me);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const roles = useMemo(
    () => (user?.roles ?? []).map((r) => r.rolename).filter(Boolean) as string[],
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      roles,
      isAdmin: roles.includes("ADMIN"),
      login,
      logout,
      refreshUser,
    }),
    [user, loading, roles, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

/** Utile pour masquer les actions réservées aux ADMIN/MANAGER. */
export function canManage(roles: string[]) {
  return roles.includes("ADMIN") || roles.includes("MANAGER");
}
