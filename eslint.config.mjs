import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Legacy compatibility relaxations for the existing codebase.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  // Node scripts may use CommonJS require.
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Legacy static JS bundles are separate from the app bundle; suppress unused warnings.
  {
    files: [
      "public/info/js/**/*.js",
      "public/info/data/**/*.js",
      "spokedu/js/**/*.js",
      "spokedu/data/**/*.js",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Admin/teacher areas still contain remote images and canvas-driven UI.
  {
    files: [
      "app/admin/**/*.{tsx,ts}",
      "app/components/admin/**/*.{tsx,ts}",
      "app/components/runtime/**/*.{tsx,ts}",
      "app/teacher/**/*.{tsx,ts}",
      "app/info/**/*.{tsx,ts}",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["app/teacher/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["lucide-react/dist/**", "lucide-react/icons/**"],
              message:
                "Use public lucide exports only: `import { IconName } from 'lucide-react'`.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/teacher/**/*.ts", "app/teacher/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              importNames: ["createClient"],
              message:
                "Teacher pages must use getSupabaseBrowserClient() so cookie sessions are preserved.",
            },
          ],
          patterns: [
            {
              group: ["lucide-react/dist/**", "lucide-react/icons/**"],
              message:
                "Use public lucide exports only: `import { IconName } from 'lucide-react'`.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
  ]),
]);

export default eslintConfig;
