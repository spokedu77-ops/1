import { redirect } from 'next/navigation';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import NoteStage2Loader from './NoteStage2Loader';

// This is a protected experimental route. Do NOT replace /admin/note here.
export const dynamic = 'force-dynamic';

export default async function NoteV2PreviewPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/login');
  return <NoteStage2Loader />;
}
