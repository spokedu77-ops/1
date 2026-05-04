import type { NextRequest } from 'next/server';

export { buildTrialInviteMessageTemplate } from '@/app/lib/spokeduProTrialInviteMessage';

export function spokeduProAppOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (host) {
    const proto = (req.headers.get('x-forwarded-proto') ?? 'https').split(',')[0]?.trim() || 'https';
    const p = proto === 'http' ? 'http' : 'https';
    return `${p}://${host.replace(/\/$/, '')}`;
  }
  return 'https://spokedu.co.kr';
}
