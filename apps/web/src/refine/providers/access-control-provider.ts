"use client";

import type { AccessControlProvider } from "@refinedev/core";
import { adminResources, canAccessResource, findAdminResource } from "../config/resources";
import { readStoredSession } from "../../lib/session";

export const accessControlProvider: AccessControlProvider = {
  can: ({ resource }) => {
    const session = readStoredSession();

    if (!session?.me) {
      return Promise.resolve({
        can: false,
        reason: "Authentication is required."
      });
    }

    if (!resource) {
      return Promise.resolve({ can: true });
    }

    const matchedResource =
      findAdminResource(resource) ??
      adminResources.find((item) => item.list === resource || item.name === resource);

    if (!matchedResource) {
      return Promise.resolve({ can: true });
    }

    const can = canAccessResource(session, matchedResource);

    return Promise.resolve({
      can,
      reason: can ? undefined : "You do not have permission to access this area."
    });
  }
};
