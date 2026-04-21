import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 기존 코드베이스와의 호환을 위해 런타임에 영향 없는 정적 규칙만 완화
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
  // 생성 산출물(workbox)은 lint 대상에서 제외
  {
    files: ["public/workbox-*.js"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
    },
  },
  // Node 실행 스크립트는 CommonJS(require) 허용
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // 레거시 정적 JS(전역 함수·미사용 export): 앱 번들과 분리, unused 경고만 소음
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
  // Admin / 런타임 / 랜딩·교사: 동적 URL·캔버스·에디터 등 <Image /> 부적합 구간 — 성능 규칙 소음 완화
  {
    files: [
      "app/admin/**/*.{tsx,ts}",
      "app/components/admin/**/*.{tsx,ts}",
      "app/components/runtime/**/*.{tsx,ts}",
      "app/(pro)/spokedu-pro/**/*.{tsx,ts}",
      "app/teacher/**/*.{tsx,ts}",
      "app/info/**/*.{tsx,ts}",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
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
    "public/workbox-*.js",
    // 참고용·통합 스니펫(린트 대상에서 제외해 경고만 감소, 런타임 미사용)
    "docs/**",
  ]),
]);

export default eslintConfig;
