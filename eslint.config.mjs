import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const vendorSdkPatterns = [
  {
    group: ["@supabase/*"],
    message: "Vendor SDKs may only be imported inside src/integrations/**. Use a port from src/domain/ports.",
  },
];

const adapterPatterns = [
  {
    group: ["@/integrations/database/**", "@/integrations/auth/**", "@/integrations/email/**"],
    message: "Do not import adapters directly. Get services from '@/integrations/container'.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  {
    // Integration boundary: vendor SDKs and concrete adapters stay at the edge.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/integrations/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...vendorSdkPatterns, ...adapterPatterns] }],
    },
  },
  {
    // Domain and application layers are framework- and vendor-free.
    files: ["src/domain/**/*.ts", "src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...vendorSdkPatterns,
            { group: ["@/integrations/**"], message: "Domain/application code must not depend on integrations." },
            { group: ["next", "next/*", "react", "react-dom"], message: "Domain/application code must be framework-free." },
          ],
        },
      ],
    },
  },
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
]);

export default eslintConfig;
