import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface User {
  userId: number;
  username: string;
  roles: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.loadTokens();
    const token = api.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setUser({ userId: payload.sub, username: payload.username, roles: payload.roles });
        } else {
          api.clearTokens();
        }
      } catch {
        api.clearTokens();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.fetch<{ accessToken: string; refreshToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    api.setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.fetch("/auth/logout", { method: "POST", body: { refreshToken: localStorage.getItem("refreshToken") } });
    } catch {
      // ignore
    }
    api.clearTokens();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) || user?.roles.includes("관리자") || false,
    [user]
  );

  const defaultRoute = user?.roles.includes("관리자")
    ? "/orders"
    : user?.roles.includes("영업팀")
      ? "/orders"
      : user?.roles.includes("물류팀")
        ? "/inventory"
        : user?.roles.includes("회계팀")
          ? "/finance"
          : "/orders";

  return { user, loading, login, logout, hasRole, defaultRoute };
}
