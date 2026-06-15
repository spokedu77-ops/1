import type { SavedAdminProgram } from '@/app/spokedu-master/lib/adminProgramEditorContract';

type ReadResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export async function loadSavedAdminProgram<Overlay, Meta>(
  curriculumId: number,
  readers: {
    readOverlay: (curriculumId: number) => Promise<ReadResult<Overlay>>;
    readMeta: (curriculumId: number) => Promise<ReadResult<Meta>>;
  },
): Promise<SavedAdminProgram<Overlay, Meta>> {
  const [overlayResult, metaResult] = await Promise.all([
    readers.readOverlay(curriculumId),
    readers.readMeta(curriculumId),
  ]);

  if (overlayResult.error) throw new Error(overlayResult.error.message);
  if (metaResult.error) throw new Error(metaResult.error.message);
  if (!overlayResult.data) throw new Error(`Saved overlay not found for curriculum ${curriculumId}.`);
  if (!metaResult.data) throw new Error(`Saved meta not found for curriculum ${curriculumId}.`);

  return {
    curriculumId,
    overlay: overlayResult.data,
    meta: metaResult.data,
  };
}
