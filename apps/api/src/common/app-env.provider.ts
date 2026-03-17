import { loadApiEnv, type ApiEnv } from "@exetron/config";

export const APP_ENV = Symbol("APP_ENV");

export const appEnvProvider = {
  provide: APP_ENV,
  useFactory: (): ApiEnv => loadApiEnv(process.env)
};
