import crypto from "node:crypto";

export interface KioskAccessTokenClaims {
  sub: string;
  tenantId: string;
  storeId: string;
  code: string;
  type: "KIOSK";
  scope: "kiosk_public";
}

export const KIOSK_ACCESS_TOKEN_TTL = "30d";
export const KIOSK_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function resolveKioskAccessTokenSecret(jwtAccessSecret: string): string {
  return crypto
    .createHash("sha256")
    .update(`kiosk-public:${jwtAccessSecret}`)
    .digest("hex");
}
