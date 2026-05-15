import type { Metadata } from 'next';
import DashboardView from './DashboardView';

export const metadata: Metadata = {
  title: '홈',
};

export default function SpokeduMasterDashboardPage() {
  return <DashboardView />;
}
