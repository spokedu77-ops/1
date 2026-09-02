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
    expect(read('report/page.tsx')).not.toMatch(/<label[^>]+font-black/);
  });

  it('makes Manage the canonical operational reference with one contextual primary action', () => {
    const manage = read('activity/page.tsx').slice(read('activity/page.tsx').indexOf('export function ManageOrchestrationSurface'));
    for (const name of ['MasterPageShell', 'MasterPageHeader', 'MasterAgenda', 'MasterSection', 'MasterCollectionRow']) expect(manage).toContain(name);
    expect(manage).not.toContain('rounded-2xl bg-white p-5');
    expect(manage).not.toContain('다음 수업 만들기');
    expect(manage).not.toContain('border-b border-slate-200 pb-5');
    expect(manage).toContain('/spokedu-master/classes?create=1');
    expect(manage.indexOf('이번 주 일정')).toBeLessThan(manage.indexOf('내 수업반'));
  });

  it('converges representative editorial surfaces', () => {
    const programs = read('programs/page.tsx');
    const favorites = read('favorites/FavoritesView.tsx');
    for (const source of [programs, favorites]) {
      expect(source).toContain('MasterPageShell');
      expect(source).toContain('MasterPageHeader');
    }
    expect(programs).toContain('수업 프로그램');
    expect(programs).toContain('<Image');
    expect(programs).not.toContain('DISCOVER · BUILD');
    expect(favorites).toContain("['all', '전체']");
    expect(favorites).toContain("['program', '놀이체육']");
    expect(favorites).toContain("['spomove', 'SPOMOVE']");
    expect(favorites).toContain('SpomoveGuidelineSheet');
    expect(read('library/LibraryView.tsx')).not.toContain('shadow-[0_10px_24px');
  });

  it('closes the equal-tab IA leak while preserving deep route implementations', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/components/lesson/LessonManagementTabs.tsx'))).toBe(false);
    expect(read('classes/page.tsx')).not.toContain('LessonManagementTabs');
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/activity/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'app/spokedu-master/classes/page.tsx'))).toBe(true);
  });
});
