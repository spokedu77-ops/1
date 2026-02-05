/**
 * 브라우저용 Supabase 클라이언트 (@supabase/ssr)
 * 세션을 쿠키에 저장해 proxy·서버(Server Action)에서 동일 세션을 읽을 수 있게 함.
 *
 * 규칙: app/teacher, app/admin 등 로그인·인증이 필요한 모든 클라이언트 페이지에서는
 * 반드시 getSupabaseBrowserClient()만 사용할 것. createClient(url, key) 사용 금지.
 * (createClient는 쿠키 세션을 읽지 않아 getUser()가 null이 되고, "로그인 필요"·데이터 미표시 등 오류 발생)
 */

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient is for client-side only');
  }
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env not set');
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
