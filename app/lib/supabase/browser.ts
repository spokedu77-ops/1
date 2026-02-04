/**
 * 브라우저용 Supabase 클라이언트 (@supabase/ssr)
 * 세션을 쿠키에 저장해 proxy·서버(Server Action)에서 동일 세션을 읽을 수 있게 함.
 * 로그인·인증이 필요한 페이지는 이 클라이언트를 사용해야 서버에서 auth.uid()가 유지됨.
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
