import {
  BadRequestException,
  InternalServerErrorException
} from "@nestjs/common";
import type { PaymentProviderConfigSecretsStateDto } from "@exetron/contracts";
import crypto from "node:crypto";

const PROVIDER_CONFIG_SECRET_ENVELOPE_KEY = "__secretEnvelope";
const PROVIDER_CONFIG_SECRET_META_KEY = "__secretMeta";

type ProviderConfigSecretEnvelope = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deriveEncryptionKey(secret: string): Buffer {
  return crypto
    .createHash("sha256")
    .update(`payment-provider-config-secrets:${secret}`)
    .digest();
}

function encryptSecrets(
  secrets: Record<string, string>,
  encryptionSecret: string
): ProviderConfigSecretEnvelope {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(encryptionSecret),
    iv
  );
  const plaintext = Buffer.from(JSON.stringify(secrets), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

function decryptSecrets(
  envelope: ProviderConfigSecretEnvelope,
  encryptionSecret: string
): Record<string, string> {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      deriveEncryptionKey(encryptionSecret),
      Buffer.from(envelope.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final()
    ]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("Decrypted provider config secrets are not an object.");
    }

    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [key, value]) => {
      if (typeof value !== "string") {
        throw new Error("Decrypted provider config secrets contain non-string values.");
      }
      accumulator[key] = value;
      return accumulator;
    }, {});
  } catch (error) {
    throw new InternalServerErrorException(
      `Payment provider config secrets are unreadable: ${
        error instanceof Error ? error.message : "unknown encryption error"
      }`
    );
  }
}

function sanitizePublicSettings(
  settings: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!settings) {
    return null;
  }

  if (PROVIDER_CONFIG_SECRET_ENVELOPE_KEY in settings || PROVIDER_CONFIG_SECRET_META_KEY in settings) {
    throw new BadRequestException(
      "Payment provider settings cannot use reserved secret metadata keys."
    );
  }

  return Object.keys(settings).length ? { ...settings } : null;
}

function normalizeSecretsInput(
  secrets: Record<string, unknown> | null
): Record<string, string> | null {
  if (secrets === null) {
    return null;
  }

  const entries = Object.entries(secrets);
  if (!entries.length) {
    return null;
  }

  return entries.reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (!/^[A-Za-z0-9._-]+$/.test(key)) {
      throw new BadRequestException(
        "Payment provider secret keys may only contain letters, digits, dot, underscore or dash."
      );
    }

    if (typeof value !== "string" || !value.trim()) {
      throw new BadRequestException(
        "Payment provider secrets must be non-empty strings."
      );
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

function readSecretMeta(
  value: unknown
): PaymentProviderConfigSecretsStateDto | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Array.isArray(value.keys)
    ? value.keys.filter((item): item is string => typeof item === "string").sort()
    : [];
  const updatedAt =
    typeof value.updatedAt === "string" && value.updatedAt.length ? value.updatedAt : null;

  if (!keys.length) {
    return null;
  }

  return {
    hasSecrets: true,
    keys,
    updatedAt
  };
}

export interface ResolvedProviderConfigSettings {
  publicSettings: Record<string, unknown> | null;
  secrets: PaymentProviderConfigSecretsStateDto | null;
  resolvedSecrets: Record<string, string> | null;
}

export function resolveProviderConfigSettings(
  storedSettings: Record<string, unknown> | null,
  encryptionSecret: string
): ResolvedProviderConfigSettings {
  if (!storedSettings) {
    return {
      publicSettings: null,
      secrets: null,
      resolvedSecrets: null
    };
  }

  const nextPublicSettings = { ...storedSettings };
  const envelope = nextPublicSettings[
    PROVIDER_CONFIG_SECRET_ENVELOPE_KEY
  ] as ProviderConfigSecretEnvelope | undefined;
  const secretMeta = readSecretMeta(nextPublicSettings[PROVIDER_CONFIG_SECRET_META_KEY]);
  delete nextPublicSettings[PROVIDER_CONFIG_SECRET_ENVELOPE_KEY];
  delete nextPublicSettings[PROVIDER_CONFIG_SECRET_META_KEY];

  return {
    publicSettings: Object.keys(nextPublicSettings).length ? nextPublicSettings : null,
    secrets: secretMeta,
    resolvedSecrets: envelope ? decryptSecrets(envelope, encryptionSecret) : null
  };
}

export function buildProviderConfigSettings(input: {
  currentSettings: Record<string, unknown> | null;
  nextSettings?: Record<string, unknown> | null;
  nextSecrets?: Record<string, unknown> | null;
  encryptionSecret: string;
}): Record<string, unknown> | null {
  const current = resolveProviderConfigSettings(
    input.currentSettings,
    input.encryptionSecret
  );
  const publicSettings =
    input.nextSettings === undefined
      ? current.publicSettings
      : sanitizePublicSettings(input.nextSettings);
  const resolvedSecrets =
    input.nextSecrets === undefined
      ? current.resolvedSecrets
      : normalizeSecretsInput(input.nextSecrets);

  const nextStoredSettings: Record<string, unknown> = publicSettings
    ? { ...publicSettings }
    : {};

  if (resolvedSecrets && Object.keys(resolvedSecrets).length) {
    nextStoredSettings[PROVIDER_CONFIG_SECRET_META_KEY] = {
      keys: Object.keys(resolvedSecrets).sort(),
      updatedAt: new Date().toISOString()
    };
    nextStoredSettings[PROVIDER_CONFIG_SECRET_ENVELOPE_KEY] = encryptSecrets(
      resolvedSecrets,
      input.encryptionSecret
    );
  }

  return Object.keys(nextStoredSettings).length ? nextStoredSettings : null;
}
