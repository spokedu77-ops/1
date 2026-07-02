import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_CACHE_TTL_MS = 15_000;
const sessionCache = new Map<string, number>();

const SPOKEDU_MASTER_PUBLIC_PREFIXES = [
  '/spokedu-master/landing',
  '/spokedu-master/payment',
  '/spokedu-master/privacy',
  '/spokedu-master/terms',
  '/spokedu-master/parent',
  '/spokedu-master/onboarding',
];

function getSessionCacheKey(request: NextRequest): string {
  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.includes('auth-token'));
  return authCookie ? authCookie.value : 'no-session';
}

function pruneSessionCache(): void {
  const now = Date.now();
  for (const [key, expiry] of sessionCache.entries()) {
    if (expiry <= now) sessionCache.delete(key);
  }
}

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
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;
  let supabase = createSupabaseProxyClient(request, response);

  if (supabase) {
    const cacheKey = getSessionCacheKey(request);
    const cachedUntil = sessionCache.get(cacheKey);
    if (cachedUntil == null || cachedUntil <= Date.now()) {
      await supabase.auth.getSession();
      sessionCache.set(cacheKey, Date.now() + SESSION_CACHE_TTL_MS);
      pruneSessionCache();
    }
  }

  if (isSpokeduMasterProtectedPath(pathname) && !canBypassSpokeduMasterAuthForQa(request)) {
    supabase ??= createSupabaseProxyClient(request, response);
    if (!supabase) return redirectWithNext(request, '/login');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirectWithNext(request, '/login');

    // MASTER entitlement is intentionally not evaluated in proxy.
    // The canonical server check lives behind /api/spokedu-master/access and
    // requireSpokeduMasterAccess(), which create server trials and fail closed
    // on database lookup errors before protected content is rendered.
  }

  if (
    pathname.startsWith('/play-phase/') ||
    pathname.startsWith('/think-phase/') ||
    pathname.startsWith('/flow-phase/')
  ) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) return new NextResponse('Access Denied: Token required', { status: 403 });
    if (!token.startsWith('token_')) return new NextResponse('Access Denied: Invalid token format', { status: 403 });
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/teacher/:path*',
    '/class/:path*',
    '/r/:path*',
    '/report/:path*',
    '/spokedu-master/:path*',
    '/play-phase/:path*',
    '/think-phase/:path*',
    '/flow-phase/:path*',
  ],
};
