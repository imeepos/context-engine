import { config } from "@sker/eslint-config/base";

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
