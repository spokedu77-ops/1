import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('OperationalDataProvider server-first contract', () => {
  const source = () => readSource('app/spokedu-master/operational/OperationalDataProvider.tsx');

  it('waits for a stable auth user UUID before fetching server data', () => {
    const text = source();

    expect(text).toContain('UUID_PATTERN');
    expect(text).toContain("profile?.id");
    expect(text).toContain("? profile.id : null");
    expect(text).toContain("if (!ownerId || !canUseAttendance)");
  });

  it('clears previous owner data on hard reload and logout, soft-refreshes on field return', () => {
    const text = source();

    expect(text).toContain('const clearData = useCallback');
    expect(text).toContain("reload('hard')");
    expect(text).toContain("reload('soft')");
    expect(text).toContain('activeOwnerRef.current = null');
    expect(text).toContain("mode === 'hard'");
  });

  it('uses only server operational APIs and never falls back to legacy storage', () => {
    const text = source();

    expect(text).toContain("'/api/spokedu-master/students'");
    expect(text).toContain("'/api/spokedu-master/sessions'");
    expect(text).not.toContain("'/api/spokedu-master/class-records'");
    expect(text).not.toContain('localStorage');
    expect(text).not.toContain('useMasterStore');
    expect(text).not.toContain('spokedu-master-store');
  });

  it('does not trust ownerId in client mutations', () => {
    const text = source();

    expect(text).toContain('createStudent');
    expect(text).toContain('deleteStudent');
    expect(text).toContain('saveSession');
    expect(text).not.toContain('owner_id');
  });

  it('uses narrow child mutations', () => {
    const text = source();
    expect(text).toContain('/programs/reorder');
    expect(text).toContain('/attendance');
  });
});

describe('student soft delete route contract', () => {
  const source = () => readSource('app/api/spokedu-master/students/[id]/route.ts');

  it('requires MASTER attendance capability and soft deletes only current owner rows', () => {
    const text = source();

    expect(text).toContain("requireSpokeduMasterCapability('attendance')");
    expect(text).toContain(".eq('owner_id', access.userId)");
    expect(text).toContain(".eq('id', id)");
    expect(text).toContain('deleted_at');
    expect(text).toContain('spokedu_master_soft_delete_student');
    expect(text).not.toContain('.delete()');
  });
});
