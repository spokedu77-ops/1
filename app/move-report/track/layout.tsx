import { redirect } from 'next/navigation';
import { requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';

export default async function MoveReportTrackLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) {
    redirect(`/login?next=${encodeURIComponent('/move-report/track')}`);
  }
  return <>{children}</>;
}
