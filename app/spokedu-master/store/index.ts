'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { RetryQueueItem } from '../lib/serviceContracts';
import { useHasPremiumEntitlement } from '../access/MasterAccessProvider';
import {
  claimPendingLegacyFavorites,
  getFavoritesByOwner,
  isFavoriteByOwner,
  migrateLegacyFavorites,
  mergeFavoriteProgramIds,
  normalizeFavoriteProgramIds,
  normalizeFavoritesByOwner,
  toggleFavoriteByOwner,
} from '../lib/favoriteLib';
import {
  flushPendingRecentProgramActivities,
  getRecentActivityOwner,
  migrateRecentActivitiesToOwner,
  type RecentProgramActivity,
  type RecentProgramActivityInput,
  upsertRecentProgramActivity,
} from '../lib/recentProgramActivity';
import { createLegacyOperationalArchiveFromPersistedStore } from '../lib/legacyOperationalArchive';
import type { Lesson, Notification, Program, Session, UserProfile } from '../types';
import { enrichProgramsWithStaticVisuals } from '../lib/enrich-programs';

type ActiveSession = {
  drillId: string;
  drillName: string;
  times: number[];
  cueCount: number;
  running: boolean;
  paused: boolean;
};

type OperationalStatus = {
  online: boolean;
  lastSyncAt: string | null;
  retryQueue: RetryQueueItem[];
};

export type ContentLoadError = 'unauthorized' | 'forbidden' | 'server' | 'network' | null;

interface MasterState {
  programs: Program[];
  programsLoaded: boolean;
  programsError: ContentLoadError;
  loadPrograms: () => Promise<void>;
  reloadPrograms: () => Promise<void>;
  profile: UserProfile | null;
  setProfile: (profile: Partial<UserProfile>) => void;
  resetProfile: () => void;
  syncSubscription: () => Promise<boolean>;
  syncMasterProfile: () => Promise<boolean>;
  localWorkspaceOwnerId: string | null;
  clearLocalWorkspace: () => void;
  clearCurrentOwnerLocalData: () => void;
  operational: OperationalStatus;
  setOnline: (online: boolean) => void;
  enqueueRetry: (item: RetryQueueItem) => void;
  removeRetry: (id: string) => void;
  sessions: Session[];
  addSession: (session: Session) => void;
  activeSession: ActiveSession | null;
  startSession: (drillId: string, drillName: string) => void;
  recordTime: (ms: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endActiveSession: () => Session | null;
  lessons: Lesson[];
  addLesson: (lesson: Lesson) => void;
  toggleLessonDone: (id: number) => void;
  deleteLessonById: (id: number) => void;
  recentProgramActivities: RecentProgramActivity[];
  pendingRecentProgramActivities: RecentProgramActivityInput[];
  recentActivityOwnerResolved: boolean;
  recordRecentProgramActivity: (activity: RecentProgramActivityInput) => void;
  favoriteProgramIdsByOwner: Record<string, string[]>;
  pendingLegacyFavoriteProgramIds: string[];
  getFavoriteProgramIds: (ownerId: string | null) => string[];
  isFavoriteProgram: (ownerId: string | null, programId: string) => boolean;
  toggleFavoriteProgram: (ownerId: string | null, programId: string) => void;
  syncFavoriteProgramsFromServer: () => Promise<boolean>;
  notifications: Notification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  classTimerMs: number;
  classTimerRunning: boolean;
  classTimerStartedAt: number | null;
  classTimerStart: () => void;
  classTimerStop: () => void;
  classTimerReset: () => void;
}

const defaultProfile: UserProfile = {
  id: 'local',
  name: '선생님',
  email: '',
  school: '',
  avatarColor: '#312e81',
  plan: 'free',
  role: 'teacher',
  centerId: null,
  centerName: null,
  ageGroups: [],
  programTypes: [],
  onboardingDone: false,
  trialEndsAt: null,
  createdAt: new Date().toISOString(),
  subscriptionStatus: 'none',
  previousPaidPlan: null,
  periodEnd: null,
};

const defaultOperational: OperationalStatus = {
  online: true,
  lastSyncAt: null,
  retryQueue: [],
};

const defaultLessons: Lesson[] = [];

const defaultNotifications: Notification[] = [];

type LocalWorkspaceState = Pick<
  MasterState,
  | 'lessons'
  | 'sessions'
  | 'activeSession'
  | 'notifications'
  | 'classTimerMs'
  | 'classTimerRunning'
  | 'classTimerStartedAt'
  | 'operational'
>;

export function clearedLocalWorkspace(
  state: Pick<MasterState, 'operational'>,
): LocalWorkspaceState {
  return {
    lessons: [],
    sessions: [],
    activeSession: null,
    notifications: [],
    classTimerMs: 0,
    classTimerRunning: false,
    classTimerStartedAt: null,
    operational: {
      ...state.operational,
      lastSyncAt: null,
      retryQueue: [],
    },
  };
}

function hasLegacyWorkspace(state: PersistedMasterState): boolean {
  return Boolean(
    state.lessons?.length ||
    state.sessions?.length ||
    state.activeSession ||
    state.notifications?.length ||
    state.classTimerMs ||
    state.classTimerRunning ||
    state.classTimerStartedAt ||
    state.operational?.lastSyncAt ||
    state.operational?.retryQueue?.length
  );
}

const brokenTextPattern = /[\u4E00-\u9FFF\uF900-\uFAFF\uFFFD]/;

function hasBrokenText(value: unknown): boolean {
  if (typeof value === 'string') return brokenTextPattern.test(value);
  if (Array.isArray(value)) return value.some(hasBrokenText);
  if (value && typeof value === 'object') return Object.values(value).some(hasBrokenText);
  return false;
}

type PersistedMasterState = Partial<MasterState> & {
  classRecords?: unknown;
  students?: unknown;
  favorites?: string[];
};

export function migrateMasterStore(persisted: unknown, persistedVersion?: number): Partial<MasterState> & Record<string, unknown> {
  const state = persisted && typeof persisted === 'object' ? (persisted as PersistedMasterState) : {};
  const archiveResult = createLegacyOperationalArchiveFromPersistedStore(
    state,
    typeof persistedVersion === 'number' ? persistedVersion : null,
  );
  const { classRecords: legacyClassRecords, students: legacyStudents, favorites: legacyFavorites, ...stateWithoutLegacyOperational } = state;
  const persistedProfile = state.profile && !hasBrokenText(state.profile) ? state.profile : null;
  const profile = persistedProfile ?? defaultProfile;
  const migrationOwnerId = getRecentActivityOwner(persistedProfile)?.ownerId ?? null;
  const hasOwnerFavorites = Boolean(
    stateWithoutLegacyOperational.favoriteProgramIdsByOwner &&
    typeof stateWithoutLegacyOperational.favoriteProgramIdsByOwner === 'object',
  );
  const favoriteProgramIdsByOwner = hasOwnerFavorites
    ? normalizeFavoritesByOwner(stateWithoutLegacyOperational.favoriteProgramIdsByOwner)
    : migrateLegacyFavorites(legacyFavorites, migrationOwnerId);
  const pendingLegacyFavoriteProgramIds = hasOwnerFavorites
    ? normalizeFavoriteProgramIds(stateWithoutLegacyOperational.pendingLegacyFavoriteProgramIds)
    : migrationOwnerId
      ? []
      : normalizeFavoriteProgramIds(legacyFavorites);
  const persistedWorkspaceOwnerId =
    typeof state.localWorkspaceOwnerId === 'string' &&
    (state.localWorkspaceOwnerId.startsWith('id:') ||
      state.localWorkspaceOwnerId.startsWith('email:'))
      ? state.localWorkspaceOwnerId
      : null;
  const localWorkspaceOwnerId = persistedWorkspaceOwnerId ?? migrationOwnerId;
  const shouldClearLegacyWorkspace =
    !persistedWorkspaceOwnerId && hasLegacyWorkspace(state) && !migrationOwnerId;
  const migratedWorkspace = shouldClearLegacyWorkspace
    ? clearedLocalWorkspace({
        operational: state.operational ?? defaultOperational,
      })
    : {
        lessons: hasBrokenText(state.lessons) ? defaultLessons : state.lessons ?? defaultLessons,
        sessions: state.sessions ?? [],
        activeSession: state.activeSession ?? null,
        notifications: hasBrokenText(state.notifications)
          ? defaultNotifications
          : state.notifications ?? defaultNotifications,
        classTimerMs: state.classTimerMs ?? 0,
        classTimerRunning: state.classTimerRunning ?? false,
        classTimerStartedAt: state.classTimerStartedAt ?? null,
        operational: state.operational ?? defaultOperational,
      };
  const migrated = {
    ...stateWithoutLegacyOperational,
    profile,
    ...migratedWorkspace,
    localWorkspaceOwnerId,
    recentProgramActivities: hasBrokenText(state.recentProgramActivities)
      ? []
      : (state.recentProgramActivities ?? []).map((activity) => ({
          ownerId: activity.ownerId,
          programId: activity.programId,
          programTitle: activity.programTitle,
          action: activity.action,
          occurredAt: activity.occurredAt,
        })),
    pendingRecentProgramActivities: [],
    recentActivityOwnerResolved: false,
    favoriteProgramIdsByOwner,
    pendingLegacyFavoriteProgramIds,
  };

  if (!archiveResult.ok) {
    return {
      ...migrated,
      classRecords: legacyClassRecords,
      students: legacyStudents,
    };
  }

  return migrated;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getServerSyncableOwnerId(ownerId: string | null): string | null {
  if (!ownerId?.startsWith('id:')) return null;
  const userId = ownerId.slice(3);
  return UUID_PATTERN.test(userId) ? ownerId : null;
}

async function pushFavoriteProgramsToServer(ownerId: string | null, programIds: string[]) {
  if (!getServerSyncableOwnerId(ownerId)) return;
  try {
    await fetch('/api/spokedu-master/program-favorites', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ programIds: normalizeFavoriteProgramIds(programIds) }),
    });
  } catch {
    // Keep local favorites; retry on next sync.
  }
}

function errorFromStatus(status: number): Exclude<ContentLoadError, null> {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  return 'server';
}

export const useMasterStore = create<MasterState>()(
  persist(
    (set, get) => ({
      programs: [],
      programsLoaded: false,
      programsError: null,
      loadPrograms: async () => {
        if (get().programsLoaded && !get().programsError) return;
        await get().reloadPrograms();
      },
      reloadPrograms: async () => {
        try {
          const res = await fetch('/api/spokedu-master/programs', { cache: 'no-store' });
          if (!res.ok) {
            const error = errorFromStatus(res.status);
            set((state) => ({
              programs: error === 'unauthorized' || error === 'forbidden' ? [] : state.programs,
              programsLoaded: true,
              programsError: error,
            }));
            return;
          }

          const json = await res.json() as { data?: Program[] };
          if (Array.isArray(json.data)) {
            set({ programs: enrichProgramsWithStaticVisuals(json.data), programsLoaded: true, programsError: null });
            return;
          }
        } catch {
          set((state) => ({ programs: state.programs, programsLoaded: true, programsError: 'network' }));
          return;
        }
        set((state) => ({ programs: state.programs, programsLoaded: true, programsError: 'server' }));
      },
      profile: defaultProfile,
      localWorkspaceOwnerId: null,
      clearLocalWorkspace: () =>
        set((state) => ({
          ...clearedLocalWorkspace(state),
        })),
      clearCurrentOwnerLocalData: () =>
        set((state) => {
          const owner = getRecentActivityOwner(state.profile);
          const ownerIds = new Set(
            [owner?.ownerId, owner?.emailOwnerId].filter(
              (ownerId): ownerId is string => Boolean(ownerId),
            ),
          );
          const favoriteProgramIdsByOwner = { ...state.favoriteProgramIdsByOwner };
          for (const ownerId of ownerIds) delete favoriteProgramIdsByOwner[ownerId];
          return {
            ...clearedLocalWorkspace(state),
            favoriteProgramIdsByOwner,
            recentProgramActivities: state.recentProgramActivities.filter(
              (activity) => !ownerIds.has(activity.ownerId),
            ),
            pendingRecentProgramActivities: [],
          };
        }),
      setProfile: (profile) =>
        set((state) => {
          const nextProfile = state.profile
            ? { ...state.profile, ...profile }
            : { ...defaultProfile, ...profile };
          if (!state.recentActivityOwnerResolved) return { profile: nextProfile };
          const owner = getRecentActivityOwner(nextProfile);
          if (!owner) return { profile: nextProfile };
          const favorites = claimPendingLegacyFavorites(
            state.favoriteProgramIdsByOwner,
            state.pendingLegacyFavoriteProgramIds,
            owner,
          );
          return {
            profile: nextProfile,
            recentProgramActivities: flushPendingRecentProgramActivities(
              state.recentProgramActivities,
              state.pendingRecentProgramActivities,
              owner,
            ),
            pendingRecentProgramActivities: [],
            ...favorites,
          };
        }),
      resetProfile: () =>
        set((state) => ({
          ...clearedLocalWorkspace(state),
          localWorkspaceOwnerId: null,
          profile: {
            ...defaultProfile,
            createdAt: new Date().toISOString(),
          },
          pendingRecentProgramActivities: [],
          recentActivityOwnerResolved: false,
        })),
      syncSubscription: async () => {
        try {
          const res = await fetch('/api/spokedu-master/subscription');
          if (!res.ok) return false;
          const json = await res.json() as {
            plan?: string;
            status?: string;
            periodEnd?: string | null;
            isAdmin?: boolean;
            userId?: string;
            email?: string | null;
            trialEndsAt?: string | null;
          };
          const serverPlan: 'free' | 'lite' | 'premium' | 'pro' | 'team' =
            json.isAdmin ? 'team' :
            json.status === 'active' && json.plan === 'team' ? 'team' :
            json.status === 'active' && json.plan === 'lite' ? 'lite' :
            json.status === 'active' && json.plan === 'premium' ? 'premium' :
            json.status === 'active' && json.plan === 'pro' ? 'pro' : 'free';
          const hasActivePaidAccess = json.isAdmin || serverPlan === 'lite' || serverPlan === 'premium' || serverPlan === 'pro' || serverPlan === 'team';
          const hasExpiredPaidAccess = json.status === 'expired';
          set((state) => {
            const nextProfile: UserProfile | null = state.profile
              ? {
                  ...state.profile,
                  plan: serverPlan,
                  role: serverPlan === 'team' ? 'director' : 'teacher',
                  onboardingDone: hasActivePaidAccess || hasExpiredPaidAccess ? true : state.profile.onboardingDone,
                  isAdmin: json.isAdmin ?? false,
                  subscriptionStatus:
                    json.status === 'active' || json.status === 'expired' || json.status === 'cancelled'
                      ? json.status
                      : 'none',
                  previousPaidPlan:
                    hasExpiredPaidAccess && (json.plan === 'lite' || json.plan === 'premium' || json.plan === 'pro' || json.plan === 'team')
                      ? json.plan
                      : hasActivePaidAccess
                        ? null
                        : state.profile.previousPaidPlan ?? null,
                  periodEnd: json.periodEnd ?? null,
                  ...(json.userId ? { id: json.userId } : {}),
                  ...(json.email ? { email: json.email } : {}),
                  trialEndsAt: json.isAdmin || hasExpiredPaidAccess ? null : (json.trialEndsAt ?? null),
                }
              : state.profile;
            const identityResolved = Boolean(json.userId || json.email);
            if (!identityResolved) {
              return {
                ...clearedLocalWorkspace(state),
                localWorkspaceOwnerId: null,
                profile: nextProfile,
                pendingRecentProgramActivities: [],
                recentActivityOwnerResolved: false,
              };
            }
            const owner = getRecentActivityOwner(nextProfile);
            if (!owner) {
              return {
                ...clearedLocalWorkspace(state),
                localWorkspaceOwnerId: null,
                profile: nextProfile,
                pendingRecentProgramActivities: [],
                recentActivityOwnerResolved: false,
              };
            }
            const favorites = claimPendingLegacyFavorites(
              state.favoriteProgramIdsByOwner,
              state.pendingLegacyFavoriteProgramIds,
              owner,
            );
            const workspace =
              state.localWorkspaceOwnerId === owner.ownerId
                ? {}
                : clearedLocalWorkspace(state);
            return {
              ...workspace,
              localWorkspaceOwnerId: owner.ownerId,
              profile: nextProfile,
              recentProgramActivities: flushPendingRecentProgramActivities(
                state.recentProgramActivities,
                state.pendingRecentProgramActivities,
                owner,
              ),
              pendingRecentProgramActivities: [],
              recentActivityOwnerResolved: true,
              ...favorites,
            };
          });
          return true;
        } catch {
          // Keep current plan when offline.
          return false;
        }
      },
      syncMasterProfile: async () => {
        try {
          const res = await fetch('/api/spokedu-master/profile', { cache: 'no-store' });
          if (!res.ok) return false;
          const json = await res.json() as {
            data?: {
              name: string;
              school: string;
              role: 'teacher' | 'director';
              ageGroups: string[];
              programTypes: string[];
              onboardingDone: boolean;
            } | null;
          };
          if (!json.data) return true;
          const data = json.data;
          set((state) => ({
            profile: state.profile
              ? {
                  ...state.profile,
                  name: data.name,
                  school: data.school,
                  role: data.role,
                  ageGroups: data.ageGroups,
                  programTypes: data.programTypes,
                  onboardingDone: data.onboardingDone,
                }
              : state.profile,
          }));
          return true;
        } catch {
          return false;
        }
      },
      operational: defaultOperational,
      setOnline: (online) => set((state) => ({ operational: { ...state.operational, online } })),
      enqueueRetry: (item) => set((state) => state.localWorkspaceOwnerId ? ({ operational: { ...state.operational, retryQueue: [item, ...state.operational.retryQueue.filter((queued) => queued.id !== item.id)].slice(0, 30) } }) : {}),
      removeRetry: (id) => set((state) => state.localWorkspaceOwnerId ? ({ operational: { ...state.operational, retryQueue: state.operational.retryQueue.filter((item) => item.id !== id) } }) : {}),
      sessions: [],
      addSession: (session) => set((state) => state.localWorkspaceOwnerId ? ({ sessions: [session, ...state.sessions].slice(0, 200), operational: { ...state.operational, lastSyncAt: new Date().toISOString() } }) : {}),
      activeSession: null,
      startSession: (drillId, drillName) => set((state) => state.localWorkspaceOwnerId ? ({ activeSession: { drillId, drillName, times: [], cueCount: 0, running: true, paused: false } }) : {}),
      recordTime: (ms) => set((state) => (state.localWorkspaceOwnerId && state.activeSession ? { activeSession: { ...state.activeSession, times: [...state.activeSession.times, ms], cueCount: state.activeSession.cueCount + 1 } } : {})),
      pauseSession: () => set((state) => state.localWorkspaceOwnerId ? ({ activeSession: state.activeSession ? { ...state.activeSession, paused: true } : null }) : {}),
      resumeSession: () => set((state) => state.localWorkspaceOwnerId ? ({ activeSession: state.activeSession ? { ...state.activeSession, paused: false } : null }) : {}),
      endActiveSession: () => {
        const { activeSession, addSession, localWorkspaceOwnerId } = get();
        if (!localWorkspaceOwnerId) return null;
        if (!activeSession?.times.length) {
          set({ activeSession: null });
          return null;
        }
        const avg = Math.round(activeSession.times.reduce((sum, time) => sum + time, 0) / activeSession.times.length);
        const best = Math.min(...activeSession.times);
        const session: Session = {
          id: Date.now().toString(),
          drillId: activeSession.drillId,
          drillName: activeSession.drillName,
          times: activeSession.times,
          cueCount: activeSession.cueCount,
          date: new Date().toISOString(),
          config: { interval: 3, count: 20, random: true, showRT: true, autoAdvance: true },
          avg,
          best,
        };
        addSession(session);
        set({ activeSession: null });
        return session;
      },
      lessons: defaultLessons,
      addLesson: (lesson) => set((state) => state.localWorkspaceOwnerId ? ({ lessons: [...state.lessons, lesson] }) : {}),
      toggleLessonDone: (id) => set((state) => state.localWorkspaceOwnerId ? ({ lessons: state.lessons.map((lesson) => (lesson.id === id ? { ...lesson, done: !lesson.done } : lesson)) }) : {}),
      deleteLessonById: (id) => set((state) => state.localWorkspaceOwnerId ? ({ lessons: state.lessons.filter((lesson) => lesson.id !== id) }) : {}),
      recentProgramActivities: [],
      pendingRecentProgramActivities: [],
      recentActivityOwnerResolved: false,
      recordRecentProgramActivity: (activity) =>
        set((state) => {
          if (!state.recentActivityOwnerResolved) {
            return {
              pendingRecentProgramActivities: [
                activity,
                ...state.pendingRecentProgramActivities.filter(
                  (pending) => pending.programId !== activity.programId,
                ),
              ].slice(0, 50),
            };
          }
          const owner = getRecentActivityOwner(state.profile);
          if (!owner) {
            return {
              pendingRecentProgramActivities: [
                activity,
                ...state.pendingRecentProgramActivities.filter(
                  (pending) => pending.programId !== activity.programId,
                ),
              ].slice(0, 50),
            };
          }
          return {
            recentProgramActivities: upsertRecentProgramActivity(
              migrateRecentActivitiesToOwner(state.recentProgramActivities, owner),
              activity,
              owner.ownerId,
            ),
          };
        }),
      favoriteProgramIdsByOwner: {},
      pendingLegacyFavoriteProgramIds: [],
      getFavoriteProgramIds: (ownerId) =>
        getFavoritesByOwner(get().favoriteProgramIdsByOwner, ownerId),
      isFavoriteProgram: (ownerId, programId) =>
        isFavoriteByOwner(get().favoriteProgramIdsByOwner, ownerId, programId),
      toggleFavoriteProgram: (ownerId, programId) => {
        set((state) => ({
          favoriteProgramIdsByOwner: toggleFavoriteByOwner(state.favoriteProgramIdsByOwner, ownerId, programId),
        }));
        void pushFavoriteProgramsToServer(ownerId, getFavoritesByOwner(get().favoriteProgramIdsByOwner, ownerId));
      },
      syncFavoriteProgramsFromServer: async () => {
        const ownerId = getServerSyncableOwnerId(getRecentActivityOwner(get().profile)?.ownerId ?? null);
        if (!ownerId) return false;
        try {
          const res = await fetch('/api/spokedu-master/program-favorites', { cache: 'no-store' });
          if (!res.ok) return false;
          const json = await res.json() as { data?: unknown };
          const remoteIds = normalizeFavoriteProgramIds(json.data);
          const localIds = getFavoritesByOwner(get().favoriteProgramIdsByOwner, ownerId);
          const mergedIds = mergeFavoriteProgramIds(localIds, remoteIds);
          set((state) => ({
            favoriteProgramIdsByOwner: {
              ...state.favoriteProgramIdsByOwner,
              [ownerId]: mergedIds,
            },
          }));
          if (mergedIds.length !== remoteIds.length || mergedIds.some((id) => !remoteIds.includes(id))) {
            await pushFavoriteProgramsToServer(ownerId, mergedIds);
          }
          return true;
        } catch {
          return false;
        }
      },
      notifications: defaultNotifications,
      markRead: (id) => set((state) => state.localWorkspaceOwnerId ? ({ notifications: state.notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)) }) : {}),
      markAllRead: () => set((state) => state.localWorkspaceOwnerId ? ({ notifications: state.notifications.map((notification) => ({ ...notification, read: true })) }) : {}),
      classTimerMs: 0,
      classTimerRunning: false,
      classTimerStartedAt: null,
      classTimerStart: () => set((state) => {
        if (!state.localWorkspaceOwnerId || state.classTimerRunning) return {};
        return { classTimerRunning: true, classTimerStartedAt: Date.now() };
      }),
      classTimerStop: () => set((state) => {
        if (!state.localWorkspaceOwnerId || !state.classTimerRunning) return {};
        return { classTimerRunning: false, classTimerMs: state.classTimerMs + (state.classTimerStartedAt ? Date.now() - state.classTimerStartedAt : 0), classTimerStartedAt: null };
      }),
      classTimerReset: () => set((state) => state.localWorkspaceOwnerId ? ({ classTimerMs: 0, classTimerRunning: false, classTimerStartedAt: null }) : {}),
    }),
    {
      name: 'spokedu-master-store',
      version: 15,
      migrate: migrateMasterStore,
      partialize: (state) => ({
        profile: state.profile,
        localWorkspaceOwnerId: state.localWorkspaceOwnerId,
        operational: state.operational,
        sessions: state.sessions,
        lessons: state.lessons,
        recentProgramActivities: state.recentProgramActivities,
        favoriteProgramIdsByOwner: state.favoriteProgramIdsByOwner,
        pendingLegacyFavoriteProgramIds: state.pendingLegacyFavoriteProgramIds,
        notifications: state.notifications,
      }),
    },
  ),
);

export const useProfile = () => useMasterStore((state) => state.profile);
export const useOperationalStatus = () => useMasterStore((state) => state.operational);
export const useIsPremium = () => useHasPremiumEntitlement();

export const useUnreadCount = () => useMasterStore((state) => state.notifications.filter((notification) => !notification.read).length);
export const useClassTimerState = () =>
  useMasterStore(
    useShallow((state) => ({
      ms: state.classTimerMs,
      running: state.classTimerRunning,
      startedAt: state.classTimerStartedAt,
    })),
  );

export const useStats = () =>
  useMasterStore(
    useShallow((state) => {
      const times = state.sessions.flatMap((session) => session.times);
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      return {
        totalSessions: state.sessions.length,
        thisWeekSessions: state.sessions.filter((session) => new Date(session.date) > weekAgo).length,
        avgRT: times.length ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 0,
        bestRT: times.length ? Math.min(...times) : 0,
        totalCues: state.sessions.reduce((total, session) => total + session.cueCount, 0),
      };
    }),
  );
