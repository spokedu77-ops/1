import CoachDashboardClient from './CoachDashboardClient';

export default async function MoveReportCoachDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CoachDashboardClient slug={slug} />;
}
