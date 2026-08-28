import { redirect } from 'next/navigation';
import { requireMoveReportTrackSession } from '@/app/lib/server/moveReportAuth';

export default async function MoveReportTrackLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireMoveReportTrackSession();
  if (!auth.ok) {
    redirect(`/login?next=${encodeURIComponent('/move-report/track')}`);
  }
  return <>{children}</>;
}
