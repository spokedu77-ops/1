import { redirect } from 'next/navigation';
import { requireAdmin } from '@/app/lib/server/adminAuth';
import MasterAdminClient from './MasterAdminClient';

export default async function MasterAdminPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect('/login');
  return <MasterAdminClient />;
}
