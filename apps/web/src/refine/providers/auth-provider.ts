"use client";

import type { AuthProvider } from "@refinedev/core";
import type { LoginRequest } from "@exetron/contracts";
import {
  createSession,
  destroySession,
  readStoredSession,
  refreshStoredSessionProfile
} from "../../lib/session";

export const authProvider: AuthProvider = {
  login: async (params: LoginRequest) => {
    await createSession(params);

    return {
      success: true,
      redirectTo: "/dashboard"
    };
  },
  logout: async () => {
    await destroySession();

    return {
      success: true,
      redirectTo: "/login"
    };
  },
  check: async () => {
    const session = await refreshStoredSessionProfile();

    if (!session?.me) {
      return {
        authenticated: false,
        logout: true,
        redirectTo: "/login"
      };
    }

    return {
      authenticated: true
    };
  },
  onError: () => {
    return Promise.resolve({
      error: undefined
    });
  },
  getIdentity: () => {
    const session = readStoredSession();

    if (!session?.me) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: session.me.user.id,
      name: `${session.me.user.firstName} ${session.me.user.lastName}`.trim(),
      avatar: undefined,
      email: session.me.user.email,
      ...session.me
    });
  },
  getPermissions: () => {
    const session = readStoredSession();
    return Promise.resolve(session?.me?.permissions ?? []);
  }
};
