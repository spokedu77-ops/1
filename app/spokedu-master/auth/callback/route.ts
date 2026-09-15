import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getSpokeduMasterProfile, upsertSpokeduMasterProfile } from '@/app/lib/server/spokeduMasterProfile';
import { getSafeMasterLoginReturnPath } from '../../lib/masterLoginReturn';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = getSafeMasterLoginReturnPath(url.searchParams.get('next'));
  if (!code) return NextResponse.redirect(new URL('/spokedu-master/login?error=oauth_callback', url.origin));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/spokedu-master/login?error=oauth_callback', url.origin));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/spokedu-master/login?error=oauth_callback', url.origin));

  const service = getServiceSupabase();
  const profile = await getSpokeduMasterProfile(service, user.id);
  if (profile.error) return NextResponse.redirect(new URL('/spokedu-master/login?error=profile_lookup', url.origin));
  if (!profile.row) {
    const created = await upsertSpokeduMasterProfile(service, user.id, {
      name: String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? '선생님').slice(0, 20),
      school: '',
      role: 'teacher',
      ageGroups: [],
      programTypes: [],
      onboardingDone: false,
    });
    if (created.error) return NextResponse.redirect(new URL('/spokedu-master/login?error=profile_create', url.origin));
  }

  const destination = profile.row?.onboarding_done
    ? next
    : `/spokedu-master/onboarding?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(new URL(destination, url.origin));
}
