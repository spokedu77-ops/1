/**
 * QA 스모크/리그레션이 남긴 임시 note 문서 일괄 삭제 (휴지통 이동).
 *
 * Usage:
 *   node scripts/admin-note-cleanup-qa-docs.mjs
 */
import { cleanupEphemeralQaDocumentsViaService } from './note-qa/cleanupEphemeralDocs.mjs';

async function main() {
  const result = await cleanupEphemeralQaDocumentsViaService();
  if (result.deleted === 0) {
    console.log('No ephemeral QA documents to clean up.');
    return;
  }
  console.log(`Moved ${result.deleted} ephemeral QA document(s) to trash:`);
  for (const title of result.titles) {
    console.log(`  - ${title}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
