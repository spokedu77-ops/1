import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** 동일 세션 재검증 방지: 15초 TTL 메모리 캐시 (getUser 네트워크 호출 감소) */
const SESSION_CACHE_TTL_MS = 15_000;
const sessionCache = new Map<string, number>();

function getSessionCacheKey(request: NextRequest): string {
  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.includes('auth-token'));
  return authCookie ? authCookie.value : 'no-session';
}

function pruneSessionCache(): void {
  const now = Date.now();
  for (const [k, expiry] of sessionCache.entries()) {
    if (expiry <= now) sessionCache.delete(k);
  }
}

/**
 * Proxy: Supabase 세션 갱신 + phase 경로 토큰 검사
 * - 매 요청마다 쿠키에서 세션을 읽고 갱신해 응답 쿠키에 설정 (Server Actions auth.uid() 유지)
 * - play/think/flow-phase 접근 시 token 파라미터 검사
 * - 같은 세션은 15초간 getUser() 스킵하여 체감 지연 감소
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    const cacheKey = getSessionCacheKey(request);
    const cachedUntil = sessionCache.get(cacheKey);
    if (cachedUntil == null || cachedUntil <= Date.now()) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });
    await supabase.auth.getUser();
    sessionCache.set(cacheKey, Date.now() + SESSION_CACHE_TTL_MS);
    pruneSessionCache();
    }
  }

  const { pathname } = request.nextUrl;

  // phase 파일들 접근 시 인증 체크
  if (
    pathname.startsWith('/play-phase/') ||
    pathname.startsWith('/think-phase/') ||
    pathname.startsWith('/flow-phase/')
  ) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return new NextResponse('Access Denied: Token required', { status: 403 });
    }
    if (!token.startsWith('token_')) {
      return new NextResponse('Access Denied: Invalid token format', { status: 403 });
    }
  }

  return response;
}

// 세션 갱신이 필요한 경로만 (나머지 요청은 proxy 미실행 → 체감 로딩 감소)
export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/class/:path*',
    '/report/:path*',
    '/play-phase/:path*',
    '/think-phase/:path*',
    '/flow-phase/:path*',
  ],
};
