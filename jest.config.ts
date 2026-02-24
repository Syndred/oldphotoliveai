import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/__tests__/**/*.property.test.ts",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(uuid)/)",
  ],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "esnext",
          moduleResolution: "bundler",
          esModuleInterop: true,
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
    "^.+\\.m?js$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};

export default config;
