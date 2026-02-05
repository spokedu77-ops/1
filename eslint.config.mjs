import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Teacher/Admin: 쿠키 세션을 쓰려면 getSupabaseBrowserClient만 사용. createClient 사용 시 로그인/데이터 미표시 오류.
  {
    files: ["app/teacher/**/*.ts", "app/teacher/**/*.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "@supabase/supabase-js", importNames: ["createClient"], message: "Teacher 페이지는 getSupabaseBrowserClient() 사용. createClient()는 쿠키 세션을 읽지 않아 오류 발생." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
