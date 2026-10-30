import { requireAdmin } from '@/app/lib/server/adminAuth';
import { MASTER_EMAIL } from '@/app/lib/constants/admin';
import ReportVersionNav from '../reports/ReportVersionNav';
import SettlementLab from './SettlementLab';

export default async function SettlementLabPage() {
  const auth = await requireAdmin();
  if (!auth.ok || auth.email?.toLowerCase() !== MASTER_EMAIL) return <p role="alert" className="p-6">MASTER 전용 정산 페이지입니다.</p>;
  return <main className="min-h-full bg-slate-50"><ReportVersionNav lab /><SettlementLab /></main>;
}
