import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  getMasterAccountType,
  INSTITUTION_LAB_DESTINATION,
} from '@/app/lib/server/institutionAccount';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return response({ institution: false }, 401);

  const { accountType, error } = await getMasterAccountType(getServiceSupabase(), user.id);
  if (error) return response({ institution: false }, 500);
  if (accountType !== 'institution') return response({ institution: false }, 403);

  return response({ institution: true, destination: INSTITUTION_LAB_DESTINATION });
}
