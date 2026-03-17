"use client";

import type { AuthMeResponse, AuthTokensResponse, LoginRequest } from "@exetron/contracts";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { login as loginRequest, logout as logoutRequest, me } from "../lib/api";

interface StoredSession extends AuthTokensResponse {
  me?: AuthMeResponse;
}

interface AuthContextValue {
  session: StoredSession | null;
  status: "loading" | "authenticated" | "guest";
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const storageKey = "exetron.session";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const persistSession = (nextSession: StoredSession | null) => {
    if (!nextSession) {
      localStorage.removeItem(storageKey);
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(nextSession));
  };

  async function hydrateSession() {
    const rawSession = localStorage.getItem(storageKey);

    if (!rawSession) {
      setStatus("guest");
      return;
    }

    try {
      const parsedSession = JSON.parse(rawSession) as StoredSession;
      const meResponse = await me(parsedSession.accessToken);
      const nextSession = { ...parsedSession, me: meResponse };
      startTransition(() => {
        setSession(nextSession);
        setStatus("authenticated");
      });
      persistSession(nextSession);
    } catch {
      persistSession(null);
      setSession(null);
      setStatus("guest");
    }
  }

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      async login(payload) {
        const authTokens = await loginRequest(payload);
        const meResponse = await me(authTokens.accessToken);
        const nextSession = { ...authTokens, me: meResponse };
        startTransition(() => {
          setSession(nextSession);
          setStatus("authenticated");
        });
        persistSession(nextSession);
      },
      async logout() {
        if (session) {
          try {
            await logoutRequest(session.refreshToken, session.accessToken);
          } catch {
            // Best-effort logout is sufficient for the admin shell.
          }
        }

        startTransition(() => {
          setSession(null);
          setStatus("guest");
        });
        persistSession(null);
      },
      async refreshProfile() {
        if (!session) {
          return;
        }

        const meResponse = await me(session.accessToken);
        const nextSession = { ...session, me: meResponse };
        startTransition(() => {
          setSession(nextSession);
          setStatus("authenticated");
        });
        persistSession(nextSession);
      }
    }),
    [persistSession, session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
