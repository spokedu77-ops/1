import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('supabase/migrations/20261022200000_admin_note_v2_foundation.sql');

describe('Admin Note v2 persistence contract', () => {
  it('ships the table and atomic reorder RPC used by the API', () => {
    expect(migration).toContain('create table if not exists public.spokedu_note_v2_documents');
    expect(migration).toContain('spokedu_note_v2_reorder_sibling_v1');
    expect(migration).toContain('for update');
  });

  it('keeps browser roles denied and service_role as the server boundary', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('for all to anon, authenticated');
    expect(migration).toContain('revoke all on table public.spokedu_note_v2_documents from public, anon, authenticated');
    expect(migration).toContain('to service_role');
  });

  it('keeps snapshot saves compare-and-swap and admin authenticated', () => {
    const route = read('app/api/admin/note-v2/documents/[id]/route.ts');
    expect(route).toContain('requireAdmin()');
    expect(route).toContain(".eq('content_version', body.baseVersion)");
    expect(route).toContain("status: 409");
  });

  it('includes Note v2 in the dedicated verification command', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(packageJson.scripts['test:admin-note']).toContain('app/lib/note-v2');
    expect(packageJson.scripts['test:admin-note']).toContain('app/api/admin/note-v2');
  });
});
