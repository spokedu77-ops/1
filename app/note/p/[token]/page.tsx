import { notFound } from 'next/navigation';
import { getPublicNoteByToken } from '@/app/lib/server/publicNote';
import { PublicNoteView } from '@/app/note/_components/PublicNoteView';

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await getPublicNoteByToken(token);
  if (!payload) notFound();

  return (
    <PublicNoteView
      document={payload.document}
      blocks={payload.blocks}
      publicPages={payload.publicPages}
    />
  );
}
