/**
 * QA 스모크/리그레션이 남긴 임시 note 문서 일괄 삭제 (휴지통 이동).
 *
 * Usage:
 *   node scripts/admin-note-cleanup-qa-docs.mjs
 *   node scripts/admin-note-cleanup-qa-docs.mjs --prefix="Foundation QA"
 */
import { cleanupEphemeralQaDocumentsViaService } from './note-qa/cleanupEphemeralDocs.mjs';

const prefixes = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith('--prefix='))
  .map((arg) => arg.slice('--prefix='.length).trim())
  .filter(Boolean);

async function main() {
  const result = await cleanupEphemeralQaDocumentsViaService(
    prefixes.length > 0 ? { titlePrefixes: prefixes } : undefined,
  );
  if (result.deleted === 0) {
    console.log('No ephemeral QA documents to clean up.');
    return;
  }
  const scope = prefixes.length > 0 ? ` for prefixes: ${prefixes.join(', ')}` : '';
  console.log(`Moved ${result.deleted} ephemeral QA document(s) to trash${scope}:`);
  for (const title of result.titles) {
    console.log(`  - ${title}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
