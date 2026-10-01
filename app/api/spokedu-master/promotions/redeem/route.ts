import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email_confirmed_at) {
    return withPrivateNoStore(NextResponse.json({ error: 'Verified account required' }, { status: 401 }));
  }
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (token.length < 32 || token.length > 256) return NextResponse.json({ error: 'Invalid promotion token' }, { status: 400 });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await getServiceSupabase().rpc('spokedu_master_redeem_promotion_invite', {
    p_user_id: user.id,
    p_token_hash: tokenHash,
  });
  if (error) return NextResponse.json({ error: 'Promotion invite is invalid or expired' }, { status: 400 });
  return NextResponse.json({ ok: true, grantId: data });
}
