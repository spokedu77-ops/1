import { NextResponse } from 'next/server';

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

  if (!isSafePurchaseUrl(publicUrl)) {
    return NextResponse.redirect(new URL(SHOP_INQUIRY_PATH, request.url), 302);
  }

  return NextResponse.redirect(publicUrl, 302);
}
