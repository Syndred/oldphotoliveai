import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/i18n/navigation$": "<rootDir>/__tests__/helpers/i18n-navigation.tsx",
    "^next-intl/routing$": "<rootDir>/__tests__/helpers/next-intl-routing.ts",
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
