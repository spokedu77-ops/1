import { CenterDetailClient } from './CenterDetailClient';

export default async function CenterDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <CenterDetailClient id={id} tab={tab} />;
}
