
import type { Config } from "jest";
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  collectCoverageFrom: ["src/app.ts"],
  coverageThreshold: { global: { branches: 60, functions: 80, lines: 80, statements: 80 } }
};
export default config;


