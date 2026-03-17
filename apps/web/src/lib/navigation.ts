import type { AdminNavItem } from "@exetron/contracts";

export const adminNavigation: AdminNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/tenants", label: "Tenants" },
  { href: "/brands", label: "Brands" },
  { href: "/categories", label: "Categories" },
  { href: "/products", label: "Products" },
  { href: "/product-variants", label: "Variants" },
  { href: "/modifiers", label: "Modifier Groups" },
  { href: "/modifier-options", label: "Modifier Options" },
  { href: "/price-lists", label: "Price Lists" },
  { href: "/catalog-overrides", label: "Catalog Overrides" },
  { href: "/stores", label: "Stores" },
  { href: "/users", label: "Users" },
  { href: "/roles", label: "Roles & Permissions" },
  { href: "/devices", label: "Devices" },
  { href: "/settings", label: "Settings" },
  { href: "/feature-flags", label: "Feature Flags" },
  { href: "/audit", label: "Audit Trail" }
];
