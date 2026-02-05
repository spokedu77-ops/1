import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';

/** 브라우저에서만 사용. PWA/쿠키 세션과 호환되도록 getSupabaseBrowserClient 사용 */
export function getSupabase() {
  if (typeof window === 'undefined') return null;
  return getSupabaseBrowserClient();
}
