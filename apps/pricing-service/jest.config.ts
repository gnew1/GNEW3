
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 70, statements: 70 }
  }
};
export default config;


