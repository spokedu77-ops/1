/**
 * 서버(Server Actions, Route Handlers, RSC)용 Supabase 클라이언트 (@supabase/ssr)
 * next/headers cookies와 연동해 세션 유지.
 * 루트 middleware.ts에서 매 요청마다 세션 갱신 후 쿠키에 설정하므로,
 * Server Action 실행 시 동일 쿠키를 읽어 auth.uid()가 유지됨.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env not set');

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component/Server Action에서 set은 무시될 수 있음
        }
      },
    },
  });
}
