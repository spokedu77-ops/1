import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), 'app/spokedu-master', file), 'utf8');

describe('MASTER Visual SSOT (not rendered PASS)', () => {
  it('declares one visual authority and keeps required semantic primitives in code', () => {
    const doc = read('MASTER_VISUAL_SYSTEM.md');
    const pointer = read('MASTER_ART_DIRECTION.md');
    const primitives = read('components/ui/MasterPrimitives.tsx');
    expect(doc).toContain('Visual SSOT');
    expect(pointer).toContain('No implementation authority');
    for (const name of ['MasterPageShell', 'MasterPageHeader', 'MasterSection', 'MasterState', 'MasterAgenda', 'MasterCollectionRow', 'MasterContentCard', 'MasterDocumentSurface']) expect(doc).toContain(name);
    for (const name of ['MasterPageShell', 'MasterPageHeader', 'MasterSection', 'MasterAgenda', 'MasterCollectionRow', 'MasterContentCard', 'MasterDocumentSurface']) expect(primitives).toContain(`function ${name}`);
  });

  it('uses inline states and row-based operational collections', () => {
    expect(read('components/ui/MasterStatePanel.tsx')).not.toMatch(/SPM_(EMPTY|STATE)_PANEL/);
    for (const file of ['classes/page.tsx', 'students/page.tsx']) {
      const source = read(file);
      expect(source).toContain('MasterCollectionRow');
      expect(source).not.toContain('SPM_COLLECTION_CARD');
    }
  });

  it('gives reports a document surface', () => {
    expect(read('report/page.tsx')).toContain('MasterDocumentSurface');
    expect(read('report/page.tsx')).not.toMatch(/<label[^>]+font-black/);
  });

  it('makes Manage the canonical operational reference with one contextual primary action', () => {
    const manage = read('manage/ManageView.tsx');
    const schedule = read('manage/ScheduleTab.tsx');
    for (const name of ['MasterPageShell', 'MasterPageHeader']) expect(manage).toContain(name);
    expect(manage).not.toContain('다음 수업 만들기');
    expect(schedule).toContain('/spokedu-master/classes?create=1');
    expect(manage).toContain('일정');
    expect(manage).toContain('출석부');
    expect(manage).not.toContain('내 수업반');
  });

  it('converges representative editorial surfaces', () => {
    const programs = read('programs/page.tsx');
    const favorites = read('favorites/FavoritesView.tsx');
    for (const source of [programs, favorites]) {
      expect(source).toContain('MasterPageShell');
      expect(source).toContain('MasterPageHeader');
    }
    expect(programs).toContain('title="프로그램"');
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
