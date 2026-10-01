import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isSupabaseAuthCookieName } from '@/app/lib/auth/supabaseAuthCookie';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

const expiredCookie = {
  path: '/',
  maxAge: 0,
  expires: new Date(0),
} as const;

export async function POST() {
  const response = NextResponse.json({ ok: true });
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // 갱신 토큰이 이미 없어도 쿠키는 만료시킨다.
  }

  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (!isSupabaseAuthCookieName(cookie.name)) continue;
    response.cookies.set(cookie.name, '', expiredCookie);
  }
  return response;
}
