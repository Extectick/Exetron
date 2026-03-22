"use client";

import type { AuthMeResponse, AuthTokensResponse, LoginRequest } from "@exetron/contracts";
import { login, logout, me } from "./api";

export interface StoredSession extends AuthTokensResponse {
  me?: AuthMeResponse;
}

export const sessionStorageKey = "exetron.admin.session";
const authChangedEvent = "exetron-auth-changed";

function emitAuthChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(authChangedEvent));
}

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(sessionStorageKey);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as StoredSession;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function writeStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(sessionStorageKey);
  } else {
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
  }

  emitAuthChanged();
}

export async function createSession(payload: LoginRequest): Promise<StoredSession> {
  const authTokens = await login(payload);
  const meResponse = await me(authTokens.accessToken);
  const session = {
    ...authTokens,
    me: meResponse
  };

  writeStoredSession(session);
  return session;
}

export async function refreshStoredSessionProfile(
  currentSession?: StoredSession | null
): Promise<StoredSession | null> {
  const session = currentSession ?? readStoredSession();
  if (!session) {
    writeStoredSession(null);
    return null;
  }

  try {
    const meResponse = await me(session.accessToken);
    const nextSession = {
      ...session,
      me: meResponse
    };
    writeStoredSession(nextSession);
    return nextSession;
  } catch {
    writeStoredSession(null);
    return null;
  }
}

export async function destroySession(currentSession?: StoredSession | null): Promise<void> {
  const session = currentSession ?? readStoredSession();

  if (session) {
    try {
      await logout(session.refreshToken, session.accessToken);
    } catch {
      // Best-effort logout is sufficient for admin runtime.
    }
  }

  writeStoredSession(null);
}

export function subscribeToSessionChanges(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === sessionStorageKey) {
      callback();
    }
  };
  const onCustomEvent = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(authChangedEvent, onCustomEvent);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(authChangedEvent, onCustomEvent);
  };
}
