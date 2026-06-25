import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, tokenStore, setUnauthorizedHandler } from "@/lib/api";
import type { LoginResponse, Me } from "@/types";

interface AuthState {
  user: Me | null;
  fullName: string | null;
  roles: string[];
  ready: boolean;
  login: (tenantCode: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setFullName(null);
      setRoles([]);
    });
  }, []);

  // On load, if a token exists, resolve identity from /auth/me.
  useEffect(() => {
    async function boot() {
      if (!tokenStore.access) {
        setReady(true);
        return;
      }
      try {
        const { data } = await api.get<Me>("/auth/me");
        setUser(data);
        setRoles(data.roles);
      } catch {
        tokenStore.clear();
      } finally {
        setReady(true);
      }
    }
    boot();
  }, []);

  async function login(tenantCode: string, email: string, password: string) {
    const { data } = await api.post<LoginResponse>("/auth/login", {
      tenantCode,
      email,
      password,
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    const me = await api.get<Me>("/auth/me");
    setUser(me.data);
    setFullName(data.fullName);
    setRoles(data.roles);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
    setFullName(null);
    setRoles([]);
  }

  function hasRole(role: string) {
    return roles.includes(role);
  }

  return (
    <AuthContext.Provider
      value={{ user, fullName, roles, ready, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
