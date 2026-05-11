import LibraryDetailView from './LibraryDetailView';

export default async function SpokeduMasterLibraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LibraryDetailView id={id} />;
}
