import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'app/spokedu-master', file), 'utf8');

describe('MASTER UI Foundation v3', () => {
  it('declares one authority and the required semantic primitives', () => {
    const doc = read('MASTER_VISUAL_SYSTEM.md');
    const primitives = read('components/ui/MasterPrimitives.tsx');
    expect(doc).toContain('sole visual authority');
    for (const name of ['MasterPageShell', 'MasterPageHeader', 'MasterSection', 'MasterState', 'MasterAgenda', 'MasterCollectionRow', 'MasterContentCard', 'MasterDocumentSurface']) expect(doc).toContain(name);
    for (const name of ['MasterPageShell', 'MasterPageHeader', 'MasterSection', 'MasterAgenda', 'MasterCollectionRow', 'MasterContentCard', 'MasterDocumentSurface']) expect(primitives).toContain(`function ${name}`);
  });

  it('uses inline states and row-based operational collections', () => {
    expect(read('components/ui/MasterStatePanel.tsx')).not.toMatch(/SPM_(EMPTY|STATE)_PANEL/);
    for (const file of ['classes/page.tsx', 'students/page.tsx']) {
      const source = read(file);
      expect(source).toContain('MasterCollectionRow');
      expect(source).not.toContain('SPM_COLLECTION_CARD');
      expect(source).not.toMatch(/<section[^>]+grid gap-3 sm:grid-cols-2/);
    }
  });

  it('gives reports a document surface', () => {
    expect(read('report/page.tsx')).toContain('MasterDocumentSurface');
  });
});
