/**
 * POST /api/spokedu-pro/screenplays/import
 * Admin 전용 - CSV/JSON 스크린플레이 일괄 업로드
 *
 * CSV 헤더: mode_id, title, subtitle, description, sort_order, preset_ref, thumbnail_url
 * is_published 기본값: false (수동 publish 필요)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

/** multipart CSV 업로드 상한 (메모리 보호). programs/import와 동일 기준 */
const MAX_CSV_IMPORT_BYTES = 5 * 1024 * 1024;

const VALID_MODE_IDS = [
  'CHALLENGE', 'FLOW', '반응인지', '순차기억', '스트룹', '이중과제',
];

type ScreenplayRow = {
  mode_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  sort_order?: number;
  preset_ref?: string;
  thumbnail_url?: string;
};

function parseCSV(csv: string): ScreenplayRow[] {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map((line) => {
    // CSV 파싱: 따옴표 안의 쉼표 처리
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });

    return {
      mode_id: row['mode_id'] ?? '',
      title: row['title'] ?? '',
      subtitle: row['subtitle'] || undefined,
      description: row['description'] || undefined,
      sort_order: row['sort_order'] ? parseInt(row['sort_order'], 10) : undefined,
      preset_ref: row['preset_ref'] || undefined,
      thumbnail_url: row['thumbnail_url'] || undefined,
    };
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let rows: ScreenplayRow[] = [];

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const body = await req.json();
      rows = Array.isArray(body) ? body : (body.screenplays ?? []);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  } else {
    // multipart/form-data (CSV 파일)
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'file field is required' }, { status: 400 });
      if (file.size > MAX_CSV_IMPORT_BYTES) {
        return NextResponse.json(
          { error: `파일이 너무 큽니다 (최대 ${Math.floor(MAX_CSV_IMPORT_BYTES / 1024 / 1024)}MB)` },
          { status: 400 }
        );
      }
      const text = await file.text();
      rows = parseCSV(text);
    } catch {
      return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }
  if (rows.length > 200) {
    return NextResponse.json({ error: 'Too many rows (max 200)' }, { status: 400 });
  }

  // 유효성 검사
  const errors: string[] = [];
  rows.forEach((row, i) => {
    if (!row.mode_id) errors.push(`Row ${i + 1}: mode_id 필요`);
    if (!row.title) errors.push(`Row ${i + 1}: title 필요`);
    if (row.mode_id && !VALID_MODE_IDS.includes(row.mode_id)) {
      errors.push(`Row ${i + 1}: 유효하지 않은 mode_id "${row.mode_id}". 허용값: ${VALID_MODE_IDS.join(', ')}`);
    }
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: errors.slice(0, 20) }, { status: 422 });
  }

  // DB upsert (mode_id + title 조합으로 중복 방지)
  const supabase = getServiceSupabase();
  const records = rows.map((row, i) => ({
    mode_id: row.mode_id,
    title: row.title,
    subtitle: row.subtitle ?? null,
    description: row.description ?? null,
    sort_order: row.sort_order ?? i + 1,
    preset_ref: row.preset_ref ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    is_published: false,
  }));

  const { data, error } = await supabase
    .from('spokedu_pro_screenplays')
    .insert(records)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    imported: data?.length ?? 0,
    total: rows.length,
    message: `${data?.length ?? 0}개 스크린플레이가 임포트되었습니다. 관리자 패널에서 is_published=true로 설정하세요.`,
  });
}
