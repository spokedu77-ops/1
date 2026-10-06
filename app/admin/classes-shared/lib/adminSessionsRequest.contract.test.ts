import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const request = readFileSync('app/admin/classes-shared/lib/adminSessionsRequest.ts', 'utf8');
const management = readFileSync('app/admin/classes-shared/hooks/useClassManagement.ts', 'utf8');
const bundle = readFileSync('app/admin/classes/components/ClassBundlePanel.tsx', 'utf8');
const masterStore = readFileSync('app/spokedu-master/store/index.ts', 'utf8');

describe('admin class Session request sharing', () => {
  it('shares only concurrent identical reads and removes completed requests', () => {
    expect(request).toContain('inFlightSessionRequests.get(query)');
    expect(request).toContain('inFlightSessionRequests.delete(query)');
    expect(request).toContain("cache: 'no-store'");
  });

  it('canonicalizes group ids so equivalent bundle reads share one request', () => {
    expect(request).toContain("groupIds.split(',').filter(Boolean).sort().join(',')");
  });

  it('is used by the calendar loader and bundle panel', () => {
    expect(management).toContain('fetchAdminSessions<SessionRow>(params)');
    expect(bundle).toContain('fetchAdminSessions<SessionRow>(groupParams)');
  });

  it('coalesces duplicate MASTER program and favorite refreshes fired together', () => {
    expect(masterStore).toContain('programsLoadInFlight');
    expect(masterStore).toContain('homeProgramsLoadInFlight');
    expect(masterStore).toContain('favoritesSyncInFlight');
  });
});
