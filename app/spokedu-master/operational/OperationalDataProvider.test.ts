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
    expect(text).toContain("if (!ownerId)");
  });

  it('clears previous owner data before loading and on logout', () => {
    const text = source();

    expect(text).toContain('const clearData = useCallback');
    expect(text.match(/clearData\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(text).toContain('activeOwnerRef.current = null');
  });

  it('uses only server operational APIs and never falls back to legacy storage', () => {
    const text = source();

    expect(text).toContain("'/api/spokedu-master/students'");
    expect(text).toContain("'/api/spokedu-master/class-records'");
    expect(text).not.toContain('localStorage');
    expect(text).not.toContain('useMasterStore');
    expect(text).not.toContain('spokedu-master-store');
  });

  it('does not trust ownerId in client mutations', () => {
    const text = source();

    expect(text).toContain('createStudent');
    expect(text).toContain('deleteStudent');
    expect(text).toContain('saveClassRecord');
    expect(text).not.toContain('owner_id');
  });
});

describe('student soft delete route contract', () => {
  const source = () => readSource('app/api/spokedu-master/students/[id]/route.ts');

  it('requires MASTER access and soft deletes only current owner rows', () => {
    const text = source();

    expect(text).toContain('requireSpokeduMasterAccess');
    expect(text).toContain(".eq('owner_id', access.userId)");
    expect(text).toContain(".eq('id', id)");
    expect(text).toContain('deleted_at');
    expect(text).not.toContain('delete()');
  });
});
