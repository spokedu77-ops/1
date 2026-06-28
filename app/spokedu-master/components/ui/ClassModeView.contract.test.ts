import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const source = read('app/spokedu-master/components/ui/ClassModeView.tsx');

describe('class-mode content honesty contract', () => {
  it('reuses the shared display model and quality report instead of local readiness checks', () => {
    expect(source).toContain('buildLessonDisplayModel(program)');
    expect(source).toContain('model.quality.status');
    expect(source).toContain("lesson.quality.status !== 'READY'");
    expect(source).not.toContain('getProgramQualityReport(program)');
  });

  it('does not invent generic class steps or safety guidance when source content is missing', () => {
    expect(source).not.toContain('공간과 준비물을 확인하고');
    expect(source).not.toContain('학생 반응에 맞춰');
    expect(source).not.toContain('수업을 시작합니다.');
    expect(source).not.toContain('안전하게 진행하세요');
    expect(source).toContain('안전 정보 없음');
  });

  it('distinguishes limited information from explicit no-equipment lessons', () => {
    expect(source).toContain('준비물 정보 없음');
    expect(source).toContain('준비물 없음');
    expect(source).toContain('일부 수업 정보가 제한적입니다.');
    expect(source).toContain('이 수업은 실행 정보가 충분하지 않습니다.');
  });

  it('sends limited or incomplete content to the exact lesson detail route', () => {
    expect(source).toContain('const detailHref = `/spokedu-master/library/${program.id}`');
    expect(source).toContain('전체 수업 자료 보기');
    expect(source).not.toContain('href="/spokedu-master/library" className="mt-6');
  });
});
