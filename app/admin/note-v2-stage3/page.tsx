import { redirect } from 'next/navigation';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import NoteStage3Loader from './NoteStage3Loader';

export const dynamic = 'force-dynamic';

export default async function NoteStage3Page() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/login');
  return <NoteStage3Loader />;
}
