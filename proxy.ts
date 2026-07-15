import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SPOKEDU_MASTER_PUBLIC_PREFIXES = [
  '/spokedu-master/landing',
  '/spokedu-master/payment',
  '/spokedu-master/privacy',
  '/spokedu-master/terms',
  '/spokedu-master/parent',
  '/spokedu-master/onboarding',
];

function createSupabaseProxyClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

function isSpokeduMasterPublicPath(pathname: string): boolean {
  return SPOKEDU_MASTER_PUBLIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isSpokeduMasterProtectedPath(pathname: string): boolean {
  return pathname === '/spokedu-master' || (pathname.startsWith('/spokedu-master/') && !isSpokeduMasterPublicPath(pathname));
}

function isPhaseTokenPath(pathname: string): boolean {
  return (
    pathname.startsWith('/play-phase/')
    || pathname.startsWith('/think-phase/')
    || pathname.startsWith('/flow-phase/')
  );
}

function validatePhaseToken(request: NextRequest): NextResponse {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) return new NextResponse('Access Denied: Token required', { status: 403 });
  if (!token.startsWith('token_')) return new NextResponse('Access Denied: Invalid token format', { status: 403 });
  return NextResponse.next();
}

function canBypassSpokeduMasterAuthForQa(request: NextRequest): boolean {
  return process.env.SPOKEDU_MASTER_QA_BYPASS_AUTH === '1' && request.cookies.get('spm-qa-auth-bypass')?.value === '1';
}

function redirectWithNext(request: NextRequest, targetPath: string): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = targetPath;
  redirectUrl.search = '';
  redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(redirectUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 토큰 전용 phase — Supabase 세션 확인 없음
  if (isPhaseTokenPath(pathname)) {
    return validatePhaseToken(request);
  }

  // 공개 MASTER 경로 — 인증 없이 통과
  if (isSpokeduMasterPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 보호 MASTER 경로만 Supabase 인증 (getUser 1회)
  if (isSpokeduMasterProtectedPath(pathname) && !canBypassSpokeduMasterAuthForQa(request)) {
    const response = NextResponse.next();
    const supabase = createSupabaseProxyClient(request, response);
    if (!supabase) return redirectWithNext(request, '/login');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirectWithNext(request, '/login');

    // MASTER entitlement is intentionally not evaluated in proxy.
    // The canonical server check lives behind /api/spokedu-master/access and
    // requireSpokeduMasterAccess(), which create server trials and fail closed
    // on database lookup errors before protected content is rendered.

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/spokedu-master',
    '/spokedu-master/:path*',
    '/play-phase/:path*',
    '/think-phase/:path*',
    '/flow-phase/:path*',
  ],
};
