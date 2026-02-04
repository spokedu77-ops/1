import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy: Supabase 세션 갱신 + phase 경로 토큰 검사
 * - 매 요청마다 쿠키에서 세션을 읽고 갱신해 응답 쿠키에 설정 (Server Actions auth.uid() 유지)
 * - play/think/flow-phase 접근 시 token 파라미터 검사
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
