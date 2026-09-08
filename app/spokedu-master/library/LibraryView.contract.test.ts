import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/spokedu-master/library/LibraryView.tsx'),
  'utf8',
);
const catalogCard = readFileSync(
  join(process.cwd(), 'app/spokedu-master/components/lesson/LessonCatalogCard.tsx'),
  'utf8',
);

describe('LibraryView favorites contract', () => {
  it('searches operational lesson fields instead of title only', () => {
    expect(source).toContain('...(program.equipment ?? [])');
    expect(source).toContain('...(program.steps ?? [])');
    expect(source).toContain('...(program.tags ?? [])');
    expect(source).not.toContain('return program.title.toLowerCase()');
    expect(source).toContain('rankLibraryPrograms(constrained, query, getProgramSearchFields)');
  });

  it('keeps the Lite resource catalog complete and separate from operational history', () => {
    expect(source).toContain('programs.filter((program) => !program.isPro)');
    expect(source).not.toContain('recentProgramRecords');
    expect(source).not.toContain('usedProgramIds');
  });

  it('uses the owner-scoped canonical selectors and action', () => {
    expect(source).toContain('state.isFavoriteProgram');
    expect(source).toContain('state.toggleFavoriteProgram');
    expect(source).not.toContain("ownerId = 'local'");
  });

  it('keeps one canonical ProgramCard implementation for the catalog', () => {
    expect(source.match(/function ProgramCard\(/g)).toHaveLength(1);
    expect(source.match(/function ProgramGrid\(/g)).toHaveLength(1);
    expect(source.match(/<ProgramGrid/g)).toHaveLength(1);
    expect(source).toContain('LessonCatalogCard');
  });

  it('provides an accessible bookmark button without opening preview', () => {
    expect(catalogCard).toContain('event.stopPropagation()');
    expect(catalogCard).toContain('aria-pressed={favorite}');
    expect(catalogCard).toContain("favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'");
  });

  it('opens preview from the media card and keeps one full-lesson CTA', () => {
    expect(catalogCard).toContain('aria-label={`${title} 수업 미리보기`}');
    expect(catalogCard.match(/onClick=\{onPreview\}/g)).toHaveLength(1);
    expect(catalogCard).not.toMatch(/>\s*수업 미리보기\s*</);
    expect(catalogCard).toContain("primaryActionLabel = '활동 살펴보기'");
    expect(source).toContain('resolveMasterContentMode');
    expect(source).toContain('getMasterContentPrimaryAction');
    expect(source).toContain('await operationalData.addSessionProgram(sessionContext.id, programId)');
    expect(source).toContain('router.push(sessionReturnHref)');
    expect(source).toContain("if (sessionId && operationalStatus !== 'ready') return;");
    expect(catalogCard).not.toContain('전체 수업 자료 보기');
    expect(source).toContain('autoplayVideo: programHasPlayableVideo(program)');
    expect(source).toContain('primaryActionLabel = getMasterContentPrimaryAction(contentMode)');
  });

  it('keeps the library search controls compact and purpose-led', () => {
    expect(source).toContain('수업에 바로 활용할 수 있는 SPOKEDU 활동을 찾아보세요.');
    expect(source).toContain('빠르게 찾기');
    expect(source).toContain('놀이체육 활동');
    expect(source).not.toContain('전체 {pool.length}개 수업');
    expect(source).toContain('placeholder="활동 이름, 교구, 종목 검색"');
    expect(source).toContain('aria-label="놀이체육 활동 검색"');
    expect(source).toContain('...(program.equipment ?? [])');
    expect(source).not.toContain('조건에 맞는 수업 찾기');
    expect(source).not.toContain('전체 프로그램 ${filteredPrograms.length}');
    expect(source).not.toContain('수업 목록');
    expect(source).not.toContain('MATERIAL_VIDEO_VALUE');
    expect(source).not.toContain('MATERIAL_SPOMOVE_VALUE');
    expect(source).not.toContain('lg:grid-cols-[minmax(0,1fr)_420px]');
    expect(source).not.toContain('href="/spokedu-master/spomove" className="inline-flex h-14');
  });

  it('leads with three compact browse axes and then the full catalog', () => {
    expect(source).toContain("const QUICK_THEME_VALUES = ['협동형', '경쟁형', '술래형', '도전형', '조절형']");
    expect(source).toContain('const QUICK_SPACE_VALUES = MASTER_SPACE_TAGS');
    expect(source).toContain('const QUICK_PARTICIPANT_VALUES = MASTER_PARTICIPANT_FORMATS');
    expect(source).toContain('toggleQuickFilter');
    expect(source).toContain('normalizeQuickBrowseFilters');
    expect(source).toContain("lg:grid-cols-[minmax(0,1fr)_auto]");
    expect(source).toContain('formatProgramSelectionReasons');
    expect(source).not.toContain('테마별 추천 영상');
    expect(source).not.toContain('LIBRARY_SITUATION_ENTRIES');
  });

  it('uses shared structured values and single-select quick axes', () => {
    expect(source).toContain('parseMasterParticipantFormats');
    expect(source).toContain('const withoutAxis = current.filter((filter) => filter.group !== nextFilter.group)');
    expect(source).toContain("['theme', 'space', 'participant']");
    expect(source).toContain("{ key: 'target', label: '대상' }");
    expect(source).toContain("{ key: 'function', label: '신체 기능' }");
    expect(source).toContain("{ key: 'movement', label: '움직임' }");
  });

  it('does not expose operational history or record cloning as a default library action', () => {
    expect(source).not.toContain('class-record?from=');
    expect(source).not.toContain('최근에 쓴 수업');
    expect(source).not.toContain('지난 수업 보기');
  });

  it('returns the existing loading skeleton before rendering the catalog', () => {
    const loadingIndex = source.indexOf('if (!programsLoaded) return <LibrarySkeleton />');
    const catalogIndex = source.indexOf('id="library-catalog"');
    expect(loadingIndex).toBeGreaterThan(-1);
    expect(catalogIndex).toBeGreaterThan(loadingIndex);
  });
});
