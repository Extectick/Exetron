import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { z } from "zod";

function loadWorkspaceEnv(): void {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
    join(process.cwd(), "../../../.env")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}

const commonSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().min(1).default("15m"),
  JWT_REFRESH_TTL: z.string().min(1).default("30d"),
  NEXT_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_API_URL: z.string().url(),
  PLATFORM_ADMIN_EMAIL: z.string().email(),
  PLATFORM_ADMIN_PASSWORD: z.string().min(8)
});

const apiSchema = commonSchema.extend({
  PORT: z.coerce.number().default(3001),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET: z.string().min(1)
});

const webSchema = commonSchema.pick({
  NEXT_PUBLIC_API_URL: true
});

const mobileSchema = commonSchema.pick({
  EXPO_PUBLIC_API_URL: true
});

export type ApiEnv = z.infer<typeof apiSchema>;
export type WebEnv = z.infer<typeof webSchema>;
export type MobileEnv = z.infer<typeof mobileSchema>;

export function loadApiEnv(env: NodeJS.ProcessEnv): ApiEnv {
  loadWorkspaceEnv();
  return apiSchema.parse(env);
}

export function loadWebEnv(env: NodeJS.ProcessEnv): WebEnv {
  loadWorkspaceEnv();
  return webSchema.parse(env);
}

export function loadMobileEnv(env: NodeJS.ProcessEnv): MobileEnv {
  loadWorkspaceEnv();
  return mobileSchema.parse(env);
}
