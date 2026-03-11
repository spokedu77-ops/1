/**
 * 스포키듀 프로그램 일괄 임포트 (Admin 전용).
 * 새 분류: 기능 종류, 메인테마, 인원구성.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { isFunctionType, isMainTheme, isGroupSize } from '@/app/lib/spokedu-pro/programClassification';

type ProgramRow = {
  id?: number | null;
  title: string;
  function_type: string;
  main_theme: string;
  group_size: string;
  video_url?: string | null;
  checklist?: string | null;
  equipment?: string | null;
  activity_method?: string | null;
  activity_tip?: string | null;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') inQuotes = !inQuotes;
    else if ((c === ',' && !inQuotes) || (c === '\t' && !inQuotes)) {
      values.push(current.trim());
      current = '';
    } else current += c;
  }
  values.push(current.trim());
  return values;
}

function parseCsvToRows(csvText: string): ProgramRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0].toLowerCase().replace(/\s+/g, '_');
  const header = parseCsvLine(headerLine);
  const rows: ProgramRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const get = (name: string, fallbackIdx: number) => {
      const idx = header.indexOf(name);
      return values[idx >= 0 ? idx : fallbackIdx] ?? '';
    };
    rows.push({
      id: (() => {
        const v = get('id', 0);
        return v ? Number(v) || null : null;
      })(),
      title: get('title', 1),
      function_type: get('function_type', 2),
      main_theme: get('main_theme', 3),
      group_size: get('group_size', 4),
      video_url: get('video_url', 5) || null,
      checklist: get('checklist', 6) || null,
      equipment: get('equipment', 7) || null,
      activity_method: get('activity_method', 8) || null,
      activity_tip: get('activity_tip', 9) || null,
    });
  }
  return rows;
}

function validateRow(row: ProgramRow): { ok: boolean; message?: string } {
  if (!row.title?.trim()) return { ok: false, message: 'title 필수' };
  if (!isFunctionType(row.function_type?.trim() ?? '')) {
    return { ok: false, message: 'function_type: 순발력, 민첩성, 리듬감, 유연성, 협응력, 심폐지구력, 근지구력 중 하나' };
  }
  if (!isMainTheme(row.main_theme?.trim() ?? '')) {
    return { ok: false, message: 'main_theme: 육상놀이체육, 협동형, 경쟁형, 도전형, 태그형 중 하나' };
  }
  if (!isGroupSize(row.group_size?.trim() ?? '')) {
    return { ok: false, message: 'group_size: 개인, 짝꿍, 소그룹, 대그룹 중 하나' };
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let rows: ProgramRow[];
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      rows = Array.isArray(body.rows) ? body.rows : [];
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file 필수' }, { status: 400 });
    rows = parseCsvToRows(await file.text());
  } else {
    return NextResponse.json(
      { error: 'Content-Type: application/json (body: { rows }) 또는 multipart/form-data (file)' },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: 0, failed: 0, total: 0, errors: [], message: '반영할 행 없음' });
  }

  const errors: { row: number; message: string }[] = [];
  const validRows: ProgramRow[] = [];
  rows.forEach((row, i) => {
    const v = validateRow(row);
    if (v.ok) validRows.push(row);
    else errors.push({ row: i + 1, message: v.message ?? '검증 실패' });
  });

  const supabase = getServiceSupabase();
  let success = 0;
  for (const row of validRows) {
    const rowNum = rows.indexOf(row) + 1;
    const payload = {
      title: row.title.trim(),
      function_type: row.function_type.trim(),
      main_theme: row.main_theme.trim(),
      group_size: row.group_size.trim(),
      video_url: row.video_url?.trim() || null,
      checklist: row.checklist?.trim() || null,
      equipment: row.equipment?.trim() || null,
      activity_method: row.activity_method?.trim() || null,
      activity_tip: row.activity_tip?.trim() || null,
      is_published: false,
    };
    if (row.id != null && Number.isInteger(Number(row.id))) {
      const { error } = await supabase.from('spokedu_pro_programs').update(payload).eq('id', Number(row.id));
      if (error) errors.push({ row: rowNum, message: error.message });
      else success++;
    } else {
      const { error } = await supabase.from('spokedu_pro_programs').insert(payload);
      if (error) errors.push({ row: rowNum, message: error.message });
      else success++;
    }
  }

  return NextResponse.json({ success, failed: rows.length - success, total: rows.length, errors: errors.slice(0, 50) });
}
