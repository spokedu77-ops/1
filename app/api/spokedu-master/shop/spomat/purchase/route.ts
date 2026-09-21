import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import {
  ensureSpokeduMasterEntitlement,
  isSpokeduMasterPaidPlanActive,
  normalizeSpokeduMasterPlan,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Only http and https are accepted as purchase destinations.
// mailto is intentionally excluded because bulk inquiry uses a separate constant.
export function isSafePurchaseUrl(url: string | undefined): url is string {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

const SHOP_INQUIRY_PATH = '/spokedu-master/shop';

export async function GET(request: Request) {
  const publicUrl = process.env.SPOMAT_PUBLIC_PURCHASE_URL;
  const premiumUrl = process.env.SPOMAT_PREMIUM_PURCHASE_URL;

  if (!isSafePurchaseUrl(publicUrl)) {
    return NextResponse.redirect(new URL(SHOP_INQUIRY_PATH, request.url), 302);
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
        if (!error && isSpokeduMasterPaidPlanActive(row) && normalizeSpokeduMasterPlan(row.plan) === 'premium') {
          isPremiumEligible = true;
        }
      }
    }
  } catch {
    isPremiumEligible = false;
  }

  if (isPremiumEligible) {
    if (!isSafePurchaseUrl(premiumUrl)) {
      return NextResponse.redirect(new URL(SHOP_INQUIRY_PATH, request.url), 302);
    }
    return NextResponse.redirect(premiumUrl, 302);
  }

  return NextResponse.redirect(publicUrl, 302);
}
