import crypto from "node:crypto";

export interface DeviceBootstrapSecret {
  bootstrapSecret: string;
  apiKeyHash: string;
}

export function createDeviceBootstrapSecret(): DeviceBootstrapSecret {
  const bootstrapSecret = crypto.randomBytes(24).toString("hex");
  const apiKeyHash = crypto
    .createHash("sha256")
    .update(bootstrapSecret)
    .digest("hex");

  return {
    bootstrapSecret,
    apiKeyHash
  };
}
