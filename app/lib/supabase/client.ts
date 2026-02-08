/**
 * 중앙화된 Supabase 클라이언트
 * - 브라우저: 쿠키 기반 (PWA 세션 안정화)
 * - 서버: anon 클라이언트 (기존 호환)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './browser';

let serverClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    return getSupabaseBrowserClient();
  }
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not set');
    }
    serverClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return serverClient;
}
