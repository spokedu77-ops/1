import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { migrateMasterStore, useMasterStore } from './index';

const lesson = { id: 1, done: false } as never;
const session = { id: 'session-a', times: [100] } as never;
const cartItem = { id: 'cart-a', qty: 1 } as never;
const notification = { id: 'note-a', read: false } as never;

function seedWorkspace(ownerId: string | null = 'id:user-a') {
  useMasterStore.setState({
    localWorkspaceOwnerId: ownerId,
    lessons: [lesson],
    sessions: [session],
    activeSession: {
      drillId: 'drill-a',
      drillName: 'Drill A',
      times: [100],
      cueCount: 1,
      running: true,
      paused: false,
    },
    cart: [cartItem],
    notifications: [notification],
    classTimerMs: 5000,
    classTimerRunning: true,
    classTimerStartedAt: 100,
    operational: {
      online: false,
      lastSyncAt: '2026-06-25T00:00:00.000Z',
      retryQueue: [{ id: 'retry-a' } as never],
    },
  });
}

function subscriptionResponse(userId?: string) {
  return new Response(JSON.stringify({
    plan: 'free',
    status: 'trial',
    isAdmin: false,
    userId,
    email: userId ? `${userId}@example.com` : null,
    trialEndsAt: '2026-07-09T00:00:00.000Z',
  }), { status: 200 });
}

describe('local workspace owner isolation', () => {
  beforeEach(() => {
    useMasterStore.getState().resetProfile();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps workspace when the same owner is synchronized again', async () => {
    seedWorkspace('id:user-a');
    vi.mocked(fetch).mockResolvedValue(subscriptionResponse('user-a'));

    expect(await useMasterStore.getState().syncSubscription()).toBe(true);
    expect(useMasterStore.getState()).toMatchObject({
      localWorkspaceOwnerId: 'id:user-a',
      lessons: [lesson],
      sessions: [session],
      cart: [cartItem],
    });
  });

  it('clears owner A workspace atomically when owner B is synchronized', async () => {
    seedWorkspace('id:user-a');
    vi.mocked(fetch).mockResolvedValue(subscriptionResponse('user-b'));
    const snapshots: Array<{ owner: string | null; lessonCount: number }> = [];
    const unsubscribe = useMasterStore.subscribe((state) => {
      snapshots.push({
        owner: state.localWorkspaceOwnerId,
        lessonCount: state.lessons.length,
      });
    });

    await useMasterStore.getState().syncSubscription();
    unsubscribe();

    expect(useMasterStore.getState()).toMatchObject({
      localWorkspaceOwnerId: 'id:user-b',
      lessons: [],
      sessions: [],
      activeSession: null,
      cart: [],
      notifications: [],
      classTimerMs: 0,
      classTimerRunning: false,
      classTimerStartedAt: null,
      operational: {
        online: false,
        lastSyncAt: null,
        retryQueue: [],
      },
    });
    expect(snapshots).not.toContainEqual({ owner: 'id:user-b', lessonCount: 1 });
  });

  it('hides and blocks workspace writes while owner is unresolved', async () => {
    seedWorkspace('id:user-a');
    vi.mocked(fetch).mockResolvedValue(subscriptionResponse());
    await useMasterStore.getState().syncSubscription();

    useMasterStore.getState().addLesson(lesson);
    useMasterStore.getState().addSession(session);
    useMasterStore.getState().addToCart(cartItem);
    useMasterStore.getState().classTimerStart();

    expect(useMasterStore.getState()).toMatchObject({
      localWorkspaceOwnerId: null,
      lessons: [],
      sessions: [],
      cart: [],
      classTimerRunning: false,
    });
  });

  it('clears sensitive workspace on reset while preserving programs and online state', () => {
    const programs = [{ id: 'program-a' }] as never;
    seedWorkspace('id:user-a');
    useMasterStore.setState({ programs });

    useMasterStore.getState().resetProfile();

    expect(useMasterStore.getState()).toMatchObject({
      programs,
      localWorkspaceOwnerId: null,
      profile: { trialEndsAt: null },
      lessons: [],
      sessions: [],
      cart: [],
      operational: { online: false, lastSyncAt: null, retryQueue: [] },
    });
  });

  it('clears only the current owner scoped data after MASTER data deletion', () => {
    seedWorkspace('id:user-a');
    useMasterStore.setState({
      profile: { id: 'user-a', email: 'a@example.com' } as never,
      favoriteProgramIdsByOwner: {
        'id:user-a': ['p1'],
        'id:user-b': ['p2'],
      },
      recentProgramActivities: [
        { ownerId: 'id:user-a', programId: 'p1' },
        { ownerId: 'id:user-b', programId: 'p2' },
      ] as never,
    });

    useMasterStore.getState().clearCurrentOwnerLocalData();

    expect(useMasterStore.getState().favoriteProgramIdsByOwner).toEqual({
      'id:user-b': ['p2'],
    });
    expect(useMasterStore.getState().recentProgramActivities).toEqual([
      expect.objectContaining({ ownerId: 'id:user-b' }),
    ]);
    expect(useMasterStore.getState().localWorkspaceOwnerId).toBe('id:user-a');
    expect(useMasterStore.getState().lessons).toEqual([]);
  });
});

describe('local workspace migration', () => {
  const workspace = {
    lessons: [lesson],
    sessions: [session],
    cart: [cartItem],
    operational: {
      online: true,
      lastSyncAt: '2026-06-25T00:00:00.000Z',
      retryQueue: [{ id: 'retry-a' }],
    },
  };

  it('assigns legacy workspace once when persisted profile safely identifies the owner', () => {
    const migrated = migrateMasterStore({
      ...workspace,
      profile: { id: 'user-a', email: 'a@example.com' },
    }, 14);
    expect(migrated.localWorkspaceOwnerId).toBe('id:user-a');
    expect(migrated.lessons).toEqual([lesson]);
  });

  it('clears unidentified legacy workspace instead of assigning it arbitrarily', () => {
    const migrated = migrateMasterStore({
      ...workspace,
      profile: { id: 'local', email: '' },
    }, 14);
    expect(migrated.localWorkspaceOwnerId).toBeNull();
    expect(migrated.lessons).toEqual([]);
    expect(migrated.sessions).toEqual([]);
    expect(migrated.operational).toMatchObject({
      online: true,
      lastSyncAt: null,
      retryQueue: [],
    });
  });

  it('does not reassign or clear a versioned owner workspace on repeated migration', () => {
    const first = migrateMasterStore({
      ...workspace,
      profile: { id: 'user-a', email: 'a@example.com' },
    }, 14);
    const second = migrateMasterStore(first, 15);
    expect(second.localWorkspaceOwnerId).toBe('id:user-a');
    expect(second.lessons).toEqual([lesson]);
  });
});
