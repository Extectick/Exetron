import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  moduleNameMapper: {
    "^@exetron/config$": "<rootDir>/../../packages/config/src/index.ts",
    "^@exetron/contracts$": "<rootDir>/../../packages/contracts/src/index.ts",
    "^@exetron/database$": "<rootDir>/../../packages/database/src/jest-index.ts",
    "^@exetron/types$": "<rootDir>/../../packages/types/src/index.ts"
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node"
};

export default config;
