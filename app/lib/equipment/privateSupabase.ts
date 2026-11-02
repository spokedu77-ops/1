import { createClient } from '@supabase/supabase-js';

/** Service-role client with default schema `private` (PostgREST). */
export function getPrivateSchemaServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase service role env not set');
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    db: { schema: 'private' },
  });
}
