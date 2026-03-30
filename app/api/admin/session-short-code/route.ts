import { NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

function generateShortCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) {
    code += alphabet[b % alphabet.length];
  }
  return code;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 이미 발급된 short_code가 있으면 그대로 반환
  const { data: existing, error: existingErr } = await supabase
    .from('sessions')
    .select('short_code')
    .eq('id', sessionId)
    .single();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const existingCode = (existing as { short_code?: string | null } | null)?.short_code;
  if (typeof existingCode === 'string' && /^[A-Z0-9]{6}$/.test(existingCode)) {
    return NextResponse.json({ shortCode: existingCode }, { status: 200 });
  }

  // short_code 발급(유니크 충돌 시 재시도)
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateShortCode();

    const { error: updateErr, data: updated } = await supabase
      .from('sessions')
      .update({ short_code: code })
      .eq('id', sessionId)
      .select('short_code')
      .single();

    if (!updateErr) {
      const updatedCode = (updated as { short_code?: string | null } | null)?.short_code;
      if (typeof updatedCode === 'string' && updatedCode) {
        return NextResponse.json({ shortCode: updatedCode }, { status: 200 });
      }
      return NextResponse.json({ error: 'short_code update succeeded but value missing' }, { status: 500 });
    }

    lastErr = updateErr;

    // Postgres unique_violation
    const errCode = (updateErr as { code?: string } | null)?.code;
    if (errCode === '23505') continue;
  }

  return NextResponse.json(
    { error: 'Failed to generate short_code', details: lastErr instanceof Error ? lastErr.message : String(lastErr) },
    { status: 500 }
  );
}

