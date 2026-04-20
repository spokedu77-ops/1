import { randomBytes, timingSafeEqual } from 'crypto';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

export const GYM_BYPASS_SETTING_KEY = 'gym_bypass_key' as const;

export function gymBypassKeysMatch(stored: string | null, providedRaw: string): boolean {
  const expected = (stored ?? '').trim();
  const provided = providedRaw.trim();
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getGymBypassKeyValue(): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('move_report_settings')
    .select('value')
    .eq('key', GYM_BYPASS_SETTING_KEY)
    .maybeSingle();
  if (error || !data || typeof data.value !== 'string') return null;
  const v = data.value.trim();
  return v.length ? v : null;
}

/** 새 키를 발급해 저장하고, 저장된 키 문자열을 반환합니다. */
export async function regenerateGymBypassKey(): Promise<string> {
  const supabase = getServiceSupabase();
  const newKey = randomBytes(16).toString('hex');
  const { error } = await supabase.from('move_report_settings').upsert(
    { key: GYM_BYPASS_SETTING_KEY, value: newKey, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
  return newKey;
}
