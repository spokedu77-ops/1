import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readSessionDetailSource } from '../../spokedu-master/manage/session-detailTestSource';

const read = (path: string) => readFileSync(path, 'utf8');
const activity = readSessionDetailSource();
const picker = read('app/spokedu-master/manage/SessionActivityPicker.tsx');
const classes = read('app/spokedu-master/classes/page.tsx');
const classDetail = read('app/spokedu-master/classes/[classId]/page.tsx');

describe('SPOKEDU MASTER class and Session operating UX', () => {
  it('creates and renames classes by id without introducing a Session title', () => {
    const createRoute = read('app/api/spokedu-master/classes/route.ts');
    const updateRoute = read('app/api/spokedu-master/classes/[classId]/route.ts');
    expect(createRoute).toContain("from('spokedu_master_classes')");
    expect(updateRoute).toContain(".eq('id', classId)");
    expect(updateRoute).toContain(".eq('owner_id', access.userId)");
    expect(classes).toContain('await data.createClass(name.trim())');
    expect(classDetail).toContain('await data.updateClass(classItem.id, editName.trim())');
    expect(activity).not.toContain('ClassManagerSheet');
  });

  it('directs an empty roster to ID-based membership management', () => {
    expect(activity).toContain('selectedClass?.studentIds.includes(student.id)');
    expect(activity).toContain('등록된 학생이 없습니다.');
    expect(activity).not.toContain('student.group ===');
  });

  it('uses a searchable multi-select picker with SPOMOVE and favorites discovery', () => {
    const mutationRoute = read('app/api/spokedu-master/sessions/[sessionId]/programs/route.ts');
    const sourceMigration = read('supabase/migrations/20260823010000_spokedu_master_session_program_sources.sql');
    expect(picker).toContain('활동 검색');
    expect(picker).toContain("(['program', 'spomove', 'favorite'] as const)");
    expect(picker).toContain('즐겨찾기');
    expect(activity).toContain('favoriteContentRefsByOwner');
    expect(activity).toContain('OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset)');
    expect(picker).toContain('setSelected');
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
    expect(activity).toContain("persist(activeSession ? 'completed' : 'scheduled')");
    expect(activity).toContain("void persist('cancelled')");
  });
});
