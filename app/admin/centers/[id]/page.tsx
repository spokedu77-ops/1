import { CenterDetailClient } from './CenterDetailClient';

export default async function CenterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CenterDetailClient id={id} />;
}
