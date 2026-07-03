import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  ensureSpokeduMasterEntitlement,
  isSpokeduMasterPaidPlanActive,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PURCHASE_URL_MISSING_ERROR =
  'SPOMAT 구매 링크가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.';
const PREMIUM_PURCHASE_URL_MISSING_ERROR =
  '회원가 구매 링크가 아직 연결되지 않았습니다. 관리자에게 문의해 주세요.';

// Only http and https are accepted as purchase destinations.
// mailto is intentionally excluded because bulk inquiry uses a separate constant.
export function isSafePurchaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function GET() {
  const publicUrl = process.env.SPOMAT_PUBLIC_PURCHASE_URL;
  const premiumUrl = process.env.SPOMAT_PREMIUM_PURCHASE_URL;

  if (!isSafePurchaseUrl(publicUrl)) {
    return NextResponse.json({ error: PURCHASE_URL_MISSING_ERROR }, { status: 503 });
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
      return NextResponse.json({ error: PREMIUM_PURCHASE_URL_MISSING_ERROR }, { status: 503 });
    }
    return NextResponse.redirect(premiumUrl, 302);
  }

  return NextResponse.redirect(publicUrl, 302);
}
