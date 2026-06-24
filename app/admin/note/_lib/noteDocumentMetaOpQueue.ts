import { devLogger } from '@/app/lib/logging/devLogger';
import { patchNoteDocument, type NoteDocumentPatch } from './noteDocumentsApi';
import type { NoteDocument } from './types';

let serial: Promise<void> = Promise.resolve();

/** 문서 메타 PATCH — 전역 순차 큐로 race를 줄인다 */
export function enqueueDocumentPatch(patch: NoteDocumentPatch): Promise<NoteDocument> {
  let resolve!: (document: NoteDocument) => void;
  let reject!: (error: Error) => void;
  const result = new Promise<NoteDocument>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  serial = serial
    .then(async () => {
      try {
        const document = await patchNoteDocument(patch);
        resolve(document);
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        reject(err);
        devLogger.error('[Note] document meta queue', err);
        throw err;
      }
    })
    .catch(() => {});

  return result;
}

export async function drainDocumentPatchQueue(): Promise<void> {
  await serial;
}
