/**
 * 개발 환경에서만 console 출력. 프로덕션에서는 no-op.
 * 기능/권한 로직과 무관하게 로그 노이즈만 줄이기 위함.
 */
const isDev = process.env.NODE_ENV === 'development';

export const devLogger = {
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};
