import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';

type SaveBody = {
  sessionId: string;
  status: 'finished' | 'verified';
  students_text: string;
  feedback_fields: unknown;
  photo_url: unknown;
  file_url: unknown;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.sessionId || (body.status !== 'finished' && body.status !== 'verified')) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('sessions')
    .update({
      status: body.status,
      students_text: body.students_text,
      feedback_fields: body.feedback_fields,
      photo_url: body.photo_url,
      file_url: body.file_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

