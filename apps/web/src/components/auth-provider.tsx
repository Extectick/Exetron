"use client";

import type { LoginRequest } from "@exetron/contracts";
import {
  createElement,
  createContext,
  startTransition,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  createSession,
  destroySession,
  readStoredSession,
  refreshStoredSessionProfile,
  subscribeToSessionChanges,
  type StoredSession
} from "../lib/session";

interface AuthContextValue {
  session: StoredSession | null;
  status: "loading" | "authenticated" | "guest";
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const hydrateSession = useCallback(async () => {
    const storedSession = readStoredSession();
    if (!storedSession) {
      startTransition(() => {
        setSession(null);
        setStatus("guest");
      });
      return;
    }

    const refreshedSession = await refreshStoredSessionProfile(storedSession);

    startTransition(() => {
      setSession(refreshedSession);
      setStatus(refreshedSession?.me ? "authenticated" : "guest");
    });
  }, []);

  useEffect(() => {
    void hydrateSession();

    return subscribeToSessionChanges(() => {
      const currentSession = readStoredSession();
      startTransition(() => {
        setSession(currentSession);
        setStatus(currentSession?.me ? "authenticated" : "guest");
      });
    });
  }, [hydrateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      async login(payload) {
        const nextSession = await createSession(payload);
        startTransition(() => {
          setSession(nextSession);
          setStatus("authenticated");
        });
      },
      async logout() {
        await destroySession(session);
        startTransition(() => {
          setSession(null);
          setStatus("guest");
        });
      },
      async refreshProfile() {
        const nextSession = await refreshStoredSessionProfile(session);
        startTransition(() => {
          setSession(nextSession);
          setStatus(nextSession?.me ? "authenticated" : "guest");
        });
      }
    }),
    [session, status]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
