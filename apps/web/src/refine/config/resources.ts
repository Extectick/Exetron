import type { IResourceItem } from "@refinedev/core";
import type { AppScope } from "@exetron/types";
import type { StoredSession } from "../../lib/session";

export type AdminNavGroup =
  | "Overview"
  | "Platform"
  | "Catalog"
  | "Operations"
  | "Intelligence"
  | "Control";

export interface AdminResourceMeta {
  label: string;
  group: AdminNavGroup;
  requiredPermission?: string;
  requiredScope?: AppScope;
  menu?: boolean;
  endpoint?: string;
}

export interface AdminResourceDefinition extends IResourceItem {
  name: string;
  list: string;
  meta: AdminResourceMeta;
}

export const adminResources: AdminResourceDefinition[] = [
  {
    name: "dashboard",
    list: "/dashboard",
    meta: { label: "Overview", group: "Overview", endpoint: "/health" }
  },
  {
    name: "onboarding",
    list: "/onboarding",
    meta: {
      label: "Onboarding",
      group: "Platform",
      requiredPermission: "tenants.write",
      requiredScope: "platform_admin"
    }
  },
  {
    name: "tenants",
    list: "/tenants",
    meta: {
      label: "Tenants",
      group: "Platform",
      requiredPermission: "tenants.read",
      requiredScope: "platform_admin",
      endpoint: "/tenants"
    }
  },
  {
    name: "stores",
    list: "/stores",
    meta: { label: "Stores", group: "Platform", requiredPermission: "stores.read", endpoint: "/stores" }
  },
  {
    name: "users",
    list: "/users",
    meta: { label: "Users", group: "Platform", requiredPermission: "users.read", endpoint: "/users" }
  },
  {
    name: "roles",
    list: "/roles",
    meta: { label: "Roles", group: "Platform", requiredPermission: "roles.read", endpoint: "/roles" }
  },
  {
    name: "devices",
    list: "/devices",
    meta: { label: "Devices", group: "Platform", requiredPermission: "devices.read", endpoint: "/devices" }
  },
  {
    name: "brands",
    list: "/brands",
    meta: { label: "Brands", group: "Catalog", requiredPermission: "brands.read", endpoint: "/brands" }
  },
  {
    name: "categories",
    list: "/categories",
    meta: {
      label: "Categories",
      group: "Catalog",
      requiredPermission: "categories.read",
      endpoint: "/categories"
    }
  },
  {
    name: "products",
    list: "/products",
    meta: { label: "Products", group: "Catalog", requiredPermission: "products.read", endpoint: "/products" }
  },
  {
    name: "product-variants",
    list: "/product-variants",
    meta: { label: "Variants", group: "Catalog", requiredPermission: "products.read", endpoint: "/products" }
  },
  {
    name: "modifiers",
    list: "/modifiers",
    meta: {
      label: "Modifier Groups",
      group: "Catalog",
      requiredPermission: "modifiers.read",
      endpoint: "/modifier-groups"
    }
  },
  {
    name: "modifier-options",
    list: "/modifier-options",
    meta: {
      label: "Modifier Options",
      group: "Catalog",
      requiredPermission: "modifiers.read",
      endpoint: "/modifier-groups"
    }
  },
  {
    name: "price-lists",
    list: "/price-lists",
    meta: {
      label: "Price Lists",
      group: "Catalog",
      requiredPermission: "pricing.read",
      endpoint: "/price-lists"
    }
  },
  {
    name: "catalog-overrides",
    list: "/catalog-overrides",
    meta: {
      label: "Catalog Overrides",
      group: "Catalog",
      requiredPermission: "pricing.read",
      endpoint: "/store-catalog-overrides"
    }
  },
  {
    name: "payments",
    list: "/payments",
    meta: { label: "Payments", group: "Operations", requiredPermission: "payments.read" }
  },
  {
    name: "payment-provider-configs",
    list: "/payment-provider-configs",
    meta: {
      label: "Payment Configs",
      group: "Operations",
      requiredPermission: "payment_configs.read"
    }
  },
  {
    name: "payment-reconciliation",
    list: "/payment-reconciliation",
    meta: { label: "Reconciliation", group: "Operations", requiredPermission: "payments.read" }
  },
  {
    name: "kitchen",
    list: "/kitchen",
    meta: { label: "Kitchen", group: "Operations", requiredPermission: "kitchen.read" }
  },
  {
    name: "order-board",
    list: "/order-board",
    meta: { label: "Order Board", group: "Operations", requiredPermission: "board.read" }
  },
  {
    name: "owner-cabinet",
    list: "/owner-cabinet",
    meta: { label: "Owner Cabinet", group: "Intelligence", requiredPermission: "analytics.read" }
  },
  {
    name: "analytics-snapshots",
    list: "/analytics-snapshots",
    meta: { label: "Analytics Snapshots", group: "Intelligence", requiredPermission: "analytics.read" }
  },
  {
    name: "settings",
    list: "/settings",
    meta: { label: "Settings", group: "Control", requiredPermission: "settings.read" }
  },
  {
    name: "feature-flags",
    list: "/feature-flags",
    meta: {
      label: "Feature Flags",
      group: "Control",
      requiredPermission: "feature_flags.read",
      endpoint: "/feature-flags"
    }
  },
  {
    name: "customization",
    list: "/customization",
    meta: { label: "Customization", group: "Control", requiredPermission: "customization.read" }
  },
  {
    name: "audit",
    list: "/audit",
    meta: { label: "Audit Trail", group: "Control", requiredPermission: "audit.read" }
  },
  {
    name: "observability",
    list: "/observability",
    meta: { label: "Observability", group: "Control", requiredScope: "platform_admin" }
  }
];

export const adminGroups: AdminNavGroup[] = [
  "Overview",
  "Platform",
  "Catalog",
  "Operations",
  "Intelligence",
  "Control"
];

export function canAccessResource(
  session: StoredSession | null,
  resource: Pick<AdminResourceDefinition, "meta">
) {
  if (!session?.me) {
    return false;
  }

  const scope = session.me.claims.scope;
  if (scope === "platform_admin") {
    return true;
  }

  if (resource.meta.requiredScope && resource.meta.requiredScope !== scope) {
    return false;
  }

  if (!resource.meta.requiredPermission) {
    return true;
  }

  return session.me.permissions.includes(resource.meta.requiredPermission);
}

export function findAdminResource(nameOrPath: string) {
  return adminResources.find(
    (resource) => resource.name === nameOrPath || resource.list === nameOrPath
  );
}
