import {
  formatWeeklyBestBylineFromSession,
  normalizeSessionPhotoUrls,
} from '@/app/lib/weeklyBestFeedback';

type MileageClient = {
  from: (table: string) => any;
};

const SESSION_CREDIT_SELECT = 'id, title, start_at, created_by, photo_url, users:created_by(name)';

function uniqueBylines(lines: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(' / ');
}

async function fetchSessionCredit(supabase: MileageClient, id: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_CREDIT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return data;
}

async function fetchSessionsByPhotoUrls(supabase: MileageClient, photoUrls: string[]) {
  if (photoUrls.length === 0) return [];

  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_CREDIT_SELECT)
    .overlaps('photo_url', photoUrls)
    .limit(12);

  if (!error && Array.isArray(data) && data.length > 0) return data;

  const matched: unknown[] = [];
  const seen = new Set<string>();
  for (const url of photoUrls.slice(0, 8)) {
    const { data: rows } = await supabase
      .from('sessions')
      .select(SESSION_CREDIT_SELECT)
      .contains('photo_url', [url])
      .limit(4);
    for (const row of rows ?? []) {
      const id = row && typeof row === 'object' && 'id' in row ? String((row as { id: unknown }).id) : '';
      if (!id || seen.has(id)) continue;
      seen.add(id);
      matched.push(row);
    }
  }
  return matched;
}

/** 포토 강사 한 줄: 연결 세션 → 같은 사진 URL을 가진 수업 순. */
export async function fetchWeeklyBestPhotoByline(
  supabase: MileageClient,
  input: {
    photoSessionId?: string | null;
    photoUrls?: string[] | null;
  },
): Promise<string | null> {
  const photoUrls = (input.photoUrls ?? []).filter((u) => typeof u === 'string' && u.trim());

  if (input.photoSessionId) {
    const row = await fetchSessionCredit(supabase, input.photoSessionId);
    const line = formatWeeklyBestBylineFromSession(row);
    if (line) return line;
  }

  const matches = await fetchSessionsByPhotoUrls(supabase, photoUrls);
  const lines = matches
    .map((row) => formatWeeklyBestBylineFromSession(row as { title?: string; start_at?: string; users?: unknown }))
    .filter(Boolean);
  if (lines.length > 0) return uniqueBylines(lines);

  return null;
}

export function sessionHasPhotos(photoUrl: unknown): boolean {
  return normalizeSessionPhotoUrls(photoUrl).length > 0;
}
