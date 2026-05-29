import { NextRequest, NextResponse } from 'next/server';
import { getPublicNoteByToken } from '@/app/lib/server/publicNote';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const payload = await getPublicNoteByToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
