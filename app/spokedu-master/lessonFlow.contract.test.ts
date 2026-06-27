import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const library = read('app/spokedu-master/library/LibraryView.tsx');
const preview = read('app/spokedu-master/components/lesson/LessonPreviewContent.tsx');
const detail = read('app/spokedu-master/library/[id]/LibraryDetailView.tsx');
const classMode = read('app/spokedu-master/components/ui/ClassModeView.tsx');
const dashboard = read('app/spokedu-master/dashboard/DashboardView.tsx');

describe('lesson discovery and execution flow contract', () => {
  it('shows decision metadata and non-conflicting card actions in the library', () => {
    expect(library).toContain('function getCardDecisionItems');
    expect(library).toContain('준비물 없음');
    expect(library).toContain('수업 미리보기');
    expect(library).toContain('전체 수업 자료 보기');
    expect(library).toContain('event.stopPropagation();');
  });

  it('keeps preview focused on quick suitability information', () => {
    expect(preview).toContain('핵심 준비물');
    expect(preview).toContain('수업 목표');
    expect(preview).toContain('주요 활동 순서 요약');
    expect(preview).toContain('model.activityMethod.slice(0, 3)');
    expect(preview).toContain('model.equipment.slice(0, 6)');
  });

  it('declares the full lesson material hierarchy and primary CTA routes', () => {
    for (const label of ['1. 수업 개요', '2. 준비물·공간', '3. 수업 목표', '4. 활동 진행 순서', '5. 규칙과 지도 포인트', '6. 난이도 조절·변형', '7. 안전 유의사항', '8. 실행 행동']) {
      expect(detail).toContain(label);
    }
    expect(detail).toContain('/spokedu-master/class-mode/${program.id}');
    expect(detail).toContain('/spokedu-master/class-record?program=${program.id}');
    expect(detail).toContain('라이브러리로');
  });

  it('guards class-mode step navigation and exposes pause/resume controls', () => {
    expect(classMode).toContain('stepNavLocked');
    expect(classMode).toContain('const moveStep = (direction: -1 | 1)');
    expect(classMode).toContain('disabled={stepIndex === 0 || stepNavLocked}');
    expect(classMode).toContain("{stepRunning ? '일시정지' : '재개'}");
    expect(classMode).toContain('수업 기록 작성');
    expect(classMode).toContain('라이브러리로');
  });

  it('adds dashboard lesson re-entry from recent and favorite programs', () => {
    expect(dashboard).toContain('data-dashboard-section="lesson-reentry"');
    expect(dashboard).toContain('최근 사용한 수업');
    expect(dashboard).toContain('즐겨찾기 수업');
    expect(dashboard).toContain('라이브러리에서 첫 수업 찾기');
    expect(dashboard).toContain('/spokedu-master/class-mode/${program.id}');
  });
});
