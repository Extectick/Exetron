import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

import baseConfig from "../../eslint.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname
});

const nextConfig = compat.extends("next/core-web-vitals").map((config) => ({
  ...config,
  settings: {
    ...config.settings,
    next: {
      ...(config.settings?.next ?? {}),
      rootDir: __dirname
    }
  }
}));

const config = [{ ignores: ["next-env.d.ts"] }, ...baseConfig, ...nextConfig];

export default config;
