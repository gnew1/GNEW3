import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  globals: { "ts-jest": { useESM: true, tsconfig: "./tsconfig.test.json" } },
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: ["src/**/*.ts"],
};

export default config;
