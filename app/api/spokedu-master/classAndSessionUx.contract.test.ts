import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const activity = read('app/spokedu-master/activity/page.tsx');

describe('SPOKEDU MASTER class and Session operating UX', () => {
  it('creates and renames classes by id without introducing a Session title', () => {
    const createRoute = read('app/api/spokedu-master/classes/route.ts');
    const updateRoute = read('app/api/spokedu-master/classes/[classId]/route.ts');
    expect(createRoute).toContain("from('spokedu_master_classes')");
    expect(updateRoute).toContain(".eq('id', classId)");
    expect(updateRoute).toContain(".eq('owner_id', access.userId)");
    expect(activity).toContain('수업반 이름은 캘린더의 수업명으로 표시됩니다.');
  });

  it('directs an empty roster to ID-based membership management', () => {
    expect(activity).toContain('selectedClass?.studentIds.includes(student.id)');
    expect(activity).toContain('명단 관리하기 →');
    expect(activity).not.toContain('student.group ===');
  });

  it('uses a searchable multi-select program picker with SPOMOVE discovery', () => {
    const mutationRoute = read('app/api/spokedu-master/sessions/[sessionId]/programs/route.ts');
    const sourceMigration = read('supabase/migrations/20260823010000_spokedu_master_session_program_sources.sql');
    expect(activity).toContain('프로그램명, 연령, 공간 검색');
    expect(activity).toContain("['spomove', 'SPOMOVE']");
    expect(activity).toContain('OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset)');
    expect(activity).toContain('selectedActivityKeys');
    expect(activity).toContain('data.addSessionSpomove');
    expect(mutationRoute).toContain('findOfficialSpomovePreset');
    expect(mutationRoute).toContain('spokedu_master_add_session_spomove');
    expect(sourceMigration).toContain("source_type = 'spomove'");
    expect(sourceMigration).toContain('spomove_preset_id');
    expect(activity).not.toContain('<option value="">프로그램 선택</option>');
  });

  it('keeps status visible while using explicit completion and cancellation actions', () => {
    expect(activity).toContain('statusLabel(status)');
    expect(activity).not.toContain('<option value="completed">');
    expect(activity).toContain("void persist('completed')");
    expect(activity).toContain("void persist('cancelled')");
  });
});
