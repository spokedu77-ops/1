import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('inactive teacher server access boundary', () => {
  it('keeps settlement access but blocks the schedule API', () => {
    expect(read('app/api/teacher/settlement-sessions/route.ts')).not.toContain('requireTeacherMaterialsAccess');
    expect(read('app/api/teacher/my-schedule/route.ts')).toContain('requireTeacherMaterialsAccess');
  });

  it('blocks session mutation APIs before checking individual sessions', () => {
    expect(read('app/api/teacher/session-feedback/route.ts')).toContain('canAccessTeacherMaterials(user, serverSupabase)');
    expect(read('app/api/teacher/session-file-upload/route.ts')).toContain('canAccessTeacherMaterials(user, supabase)');
  });

  it('blocks inactive operations teachers from every SPOKEDU MASTER access level', () => {
    const source = read('app/lib/server/spokeduMasterAccess.ts');
    expect(source.match(/canAccessTeacherMaterials\(user, serverSupabase\)/g)).toHaveLength(3);
    expect(source).toContain("reason: 'inactive_teacher'");
  });
});
