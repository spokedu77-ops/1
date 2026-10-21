import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const file = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pagePath = 'app/admin/note-v2-preview/page.tsx';
const loaderPath = 'app/admin/note-v2-preview/NoteStage2Loader.tsx';
const editorPath = 'app/admin/note-v2-preview/NoteStage2Editor.tsx';
const schemaPath = 'app/admin/note-v2-preview/noteStage2Schema.ts';

function inspect({ page, loader, editor, schema }) {
  const failures = [];
  if (!page.includes('requireAdmin()')) failures.push('MISSING_SERVER_ADMIN_AUTH');
  if (!page.includes("redirect('/login')")) failures.push('MISSING_ADMIN_DENIAL');
  if (!loader.includes('ssr: false')) failures.push('MISSING_CLIENT_ONLY_EDITOR');
  if (!editor.includes('useCreateBlockNote({')) failures.push('MISSING_SINGLE_EDITOR');
  if (!editor.includes('BlockNoteView editor={editor}')) failures.push('MISSING_BLOCKNOTE_VIEW');
  if (!editor.includes('dictionary: ko')) failures.push('MISSING_KOREAN_LOCALE');
  const needed = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem', 'quote', 'divider'];
  for (const name of needed) if (!schema.includes(`${name}:`)) failures.push(`MISSING_BLOCK_${name}`);
  for (const forbidden of ['image:', 'video:', 'audio:', 'table:', 'file:', 'embed:']) {
    if (schema.includes(forbidden)) failures.push(`FORBIDDEN_SCHEMA_${forbidden}`);
  }
  for (const forbidden of ['fetch(', 'localStorage', 'sessionStorage', 'supabase', '/api/admin/note/']) {
    if (editor.includes(forbidden)) failures.push(`FORBIDDEN_PERSISTENCE_${forbidden}`);
  }
  return failures;
}

const actual = { page: file(pagePath), loader: file(loaderPath), editor: file(editorPath), schema: file(schemaPath) };
const problems = inspect(actual);
if (problems.length) {
  console.error('STATIC CONTRACT FAIL', problems.join(', '));
  process.exit(1);
}
console.log('STATIC CONTRACT PASS: gated isolated editor, allowed blocks, no persistence code');

if (process.argv.includes('--self-test')) {
  const corrupted = { ...actual, page: actual.page.replace('requireAdmin()', 'unauthenticatedDemo()') };
  const failures = inspect(corrupted);
  assert(failures.includes('MISSING_SERVER_ADMIN_AUTH'), 'Negative control failed to catch removed authorization');
  const corruptedSchema = { ...actual, schema: actual.schema + '\nimage: defaultBlockSpecs.image,\n' };
  assert(inspect(corruptedSchema).some((f) => f.startsWith('FORBIDDEN_SCHEMA_')), 'Negative control failed to catch media');
  console.log('QA-OF-QA STATIC NEGATIVE CONTROL PASS: deliberately corrupted source rejected');
}
console.log('WARNING: No runtime/build/browser/IME test was executed. All browser cases remain BLOCKED.');
