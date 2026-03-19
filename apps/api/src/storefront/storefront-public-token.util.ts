import crypto from "node:crypto";

export interface StorefrontCartAccessTokenClaims {
  sub: string;
  tenantId: string;
  storeId: string;
  pointKey: string | null;
  customerPhone: string | null;
  mode: "GUEST" | "CUSTOMER";
  scope: "storefront_cart_public";
}

export interface StorefrontOrderTrackingTokenClaims {
  sub: string;
  tenantId: string;
  storeId: string;
  pointKey: string | null;
  customerPhone: string | null;
  scope: "storefront_order_tracking";
}

export interface StorefrontCustomerSessionClaims {
  sub: string;
  tenantId: string;
  storeId: string;
  customerName: string | null;
  customerPhone: string;
  scope: "storefront_customer_session";
}

export interface StorefrontQrClaims {
  sub: string;
  tenantId: string;
  storeId: string;
  storeCode: string;
  pointKey: string | null;
  locale: string | null;
  scope: "storefront_qr_public";
}

export const STOREFRONT_CART_ACCESS_TOKEN_TTL = "7d";
export const STOREFRONT_CART_ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const STOREFRONT_TRACKING_TOKEN_TTL = "30d";
export const STOREFRONT_TRACKING_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const STOREFRONT_CUSTOMER_SESSION_TTL = "30d";
export const STOREFRONT_CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const STOREFRONT_QR_TOKEN_TTL = "365d";
export const STOREFRONT_QR_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export function resolveStorefrontPublicTokenSecret(jwtAccessSecret: string): string {
  return crypto
    .createHash("sha256")
    .update(`storefront-public:${jwtAccessSecret}`)
    .digest("hex");
}
