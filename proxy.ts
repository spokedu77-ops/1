import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LEGACY_PRODUCTION_HOST = 'spokedu.vercel.app';
const CANONICAL_ORIGIN = 'https://spokedu.kr';

const SPOKEDU_MASTER_PUBLIC_PREFIXES = [
  '/spokedu-master/landing',
  '/spokedu-master/login',
  '/spokedu-master/auth',
  '/spokedu-master/privacy',
  '/spokedu-master/terms',
  '/spokedu-master/parent',
  '/spokedu-master/promotions/redeem',
  '/spokedu-master/onboarding',
  '/spokedu-master/manifest.webmanifest',
];

function normalizeSpokeduLabPath(pathname: string): string {
  if (pathname === '/spokedu-lab') return pathname;
  if (pathname.startsWith('/spokedu-lab/')) {
    return pathname.replace('/spokedu-lab', '/spokedu-master');
  }
  return pathname;
}

function createSupabaseProxyClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  return { supabase, getResponse: () => response };
}

function isSpokeduMasterPublicPath(pathname: string): boolean {
  const normalizedPathname = normalizeSpokeduLabPath(pathname);
  return SPOKEDU_MASTER_PUBLIC_PREFIXES.some(
    (path) => normalizedPathname === path || normalizedPathname.startsWith(`${path}/`),
  );
}

function isSpokeduMasterProtectedPath(pathname: string): boolean {
  const normalizedPathname = normalizeSpokeduLabPath(pathname);
  return normalizedPathname === '/spokedu-master'
    || (normalizedPathname.startsWith('/spokedu-master/') && !isSpokeduMasterPublicPath(pathname));
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

function redirectWithNext(
  request: NextRequest,
  targetPath: string,
  cookieSource?: NextResponse,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = targetPath;
  redirectUrl.search = '';
  redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const redirect = NextResponse.redirect(redirectUrl);
  cookieSource?.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

function clearStaleSupabaseAuthCookies(request: NextRequest, response: NextResponse): void {
  request.cookies.getAll().forEach((cookie) => {
    if (!cookie.name.startsWith('sb-') || !cookie.name.includes('auth-token')) return;
    response.cookies.set(cookie.name, '', { expires: new Date(0), maxAge: 0, path: '/' });
  });
}

export async function proxy(request: NextRequest) {
  const requestHost = (
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.hostname
  ).split(':')[0].toLowerCase();
  const isLegacyCatalogQuery =
    request.nextUrl.pathname === '/spomove' &&
    request.nextUrl.searchParams.get('tab') === 'catalog';

  // Redirect only Vercel's stable production alias. Preview deployments and
  // localhost must remain available for development and QA.
  if (requestHost === LEGACY_PRODUCTION_HOST) {
    const pathname = isLegacyCatalogQuery ? '/spomove/catalog' : request.nextUrl.pathname;
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    if (isLegacyCatalogQuery) searchParams.delete('tab');
    const search = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, CANONICAL_ORIGIN),
      308,
    );
  }

  if (isLegacyCatalogQuery) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/spomove/catalog';
    redirectUrl.searchParams.delete('tab');
    return NextResponse.redirect(redirectUrl, 308);
  }

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
  if (isSpokeduMasterProtectedPath(pathname)) {
    const proxyClient = createSupabaseProxyClient(request);
    const loginPath = pathname.startsWith('/spokedu-lab/') ? '/spokedu-lab/login' : '/spokedu-master/login';
    if (!proxyClient) return redirectWithNext(request, loginPath);

    const {
      data: { user },
      error: userError,
    } = await proxyClient.supabase.auth.getUser();
    const response = proxyClient.getResponse();

    if (!user) {
      if (userError) clearStaleSupabaseAuthCookies(request, response);
      return redirectWithNext(request, loginPath, response);
    }

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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
