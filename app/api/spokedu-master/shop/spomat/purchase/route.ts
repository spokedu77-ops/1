import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  ensureSpokeduMasterEntitlement,
  isSpokeduMasterPaidPlanActive,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fallback URLs used when env vars are not set.
// Replace SPOMAT_PUBLIC_PURCHASE_URL / SPOMAT_PREMIUM_PURCHASE_URL in the server
// environment to point at the real external store.
const SPOMAT_DEFAULT_PUBLIC_URL = 'https://example.com/spomat';
const SPOMAT_DEFAULT_PREMIUM_URL = 'https://example.com/spomat-premium';

// Only http and https are accepted as purchase destinations.
// mailto is intentionally excluded — bulk inquiry uses a separate constant.
export function isSafePurchaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function GET() {
  const publicUrl = process.env.SPOMAT_PUBLIC_PURCHASE_URL ?? SPOMAT_DEFAULT_PUBLIC_URL;
  const premiumUrl = process.env.SPOMAT_PREMIUM_PURCHASE_URL ?? SPOMAT_DEFAULT_PREMIUM_URL;

  if (!isSafePurchaseUrl(publicUrl)) {
    return NextResponse.json({ error: '구매 링크가 준비되지 않았습니다.' }, { status: 503 });
  }

  let isPremiumEligible = false;

  try {
    const serverSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (user) {
      const isAdmin = await isPlatformAdminUser(user, serverSupabase);
      if (!isAdmin) {
        const serviceSupabase = getServiceSupabase();
        const { row, error } = await ensureSpokeduMasterEntitlement(serviceSupabase, user.id);
        if (!error && isSpokeduMasterPaidPlanActive(row) && row.plan === 'premium') {
          isPremiumEligible = true;
        }
      }
    }
  } catch {
    isPremiumEligible = false;
  }

  if (isPremiumEligible) {
    if (!isSafePurchaseUrl(premiumUrl)) {
      return NextResponse.json({ error: '회원가 구매 링크를 사용할 수 없습니다.' }, { status: 503 });
    }
    return NextResponse.redirect(premiumUrl, 302);
  }

  return NextResponse.redirect(publicUrl, 302);
}
