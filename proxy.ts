import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_CACHE_TTL_MS = 15_000;
const sessionCache = new Map<string, number>();

type SpokeduMasterSubscription = {
  plan: string;
  status: string;
  period_end: string | null;
};

const DEFAULT_PLATFORM_ADMIN_EMAILS = [
  'choijihoon@spokedu.com',
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
];

function parseEmailList(value?: string | null): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function getSpokeduMasterAdminEmails(): string[] {
  const spmAdminEmails = parseEmailList(process.env.SPM_ADMIN_EMAILS);
  if (spmAdminEmails.length > 0) return spmAdminEmails;

  const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
  if (adminEmails.length > 0) return adminEmails;

  return DEFAULT_PLATFORM_ADMIN_EMAILS;
}

const SPM_ADMIN_EMAILS = getSpokeduMasterAdminEmails();

const SPOKEDU_MASTER_PUBLIC_PREFIXES = [
  '/spokedu-master/landing',
  '/spokedu-master/payment',
  '/spokedu-master/privacy',
  '/spokedu-master/terms',
  '/spokedu-master/parent',
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

function redirectWithNext(request: NextRequest, targetPath: string): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = targetPath;
  redirectUrl.search = '';
  redirectUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(redirectUrl);
}

function isActiveSubscription(subscription: SpokeduMasterSubscription | null): boolean {
  if (!subscription || subscription.status !== 'active') return false;
  if (!subscription.period_end) return true;
  return new Date(subscription.period_end).getTime() >= Date.now();
}

function isInTrial(userCreatedAt: string | undefined): boolean {
  if (!userCreatedAt) return false;
  const trialEndsAt = new Date(userCreatedAt).getTime() + 14 * 24 * 60 * 60 * 1000;
  return trialEndsAt >= Date.now();
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

  if (isSpokeduMasterProtectedPath(pathname)) {
    supabase ??= createSupabaseProxyClient(request, response);
    if (!supabase) return redirectWithNext(request, '/login');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirectWithNext(request, '/login');

    const isAdmin = SPM_ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '');
    if (!isAdmin) {
      const { data } = await supabase
        .from('spokedu_master_subscriptions')
        .select('plan,status,period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      const subscription = data as SpokeduMasterSubscription | null;

      if (!isActiveSubscription(subscription) && !isInTrial(user.created_at)) {
        return redirectWithNext(request, '/spokedu-master/payment');
      }
    }
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
