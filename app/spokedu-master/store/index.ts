'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { RetryQueueItem } from '../lib/serviceContracts';
import { hasMasterAccess } from '../lib/subscription';
import type { CartItem, ClassRecord, ClassStudentRecord, Drill, Lesson, Notification, Program, Session, StudentProfile, UserProfile } from '../types';
import { DRILLS as STATIC_DRILLS, PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
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

interface MasterState {
  programs: Program[];
  programsLoaded: boolean;
  loadPrograms: () => Promise<void>;
  reloadPrograms: () => Promise<void>;
  drills: Drill[];
  drillsLoaded: boolean;
  loadDrills: () => Promise<void>;
  profile: UserProfile | null;
  setProfile: (profile: Partial<UserProfile>) => void;
  resetProfile: () => void;
  syncSubscription: () => Promise<void>;
  operational: OperationalStatus;
  setOnline: (online: boolean) => void;
  setLastSyncNow: () => void;
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
  students: StudentProfile[];
  addStudent: (name: string, group: string, meta: string, id?: string) => void;
  removeStudent: (id: string) => void;
  classRecords: ClassRecord[];
  saveClassRecord: (record: ClassRecord) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
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
  trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

const defaultOperational: OperationalStatus = {
  online: true,
  lastSyncAt: null,
  retryQueue: [],
};

const defaultLessons: Lesson[] = [];

const defaultStudents: StudentProfile[] = [];

const defaultNotifications: Notification[] = [];

const brokenTextPattern = /[\u4E00-\u9FFF\uF900-\uFAFF\uFFFD]/;

function hasBrokenText(value: unknown): boolean {
  if (typeof value === 'string') return brokenTextPattern.test(value);
  if (Array.isArray(value)) return value.some(hasBrokenText);
  if (value && typeof value === 'object') return Object.values(value).some(hasBrokenText);
  return false;
}

function migrateMasterStore(persisted: unknown): Partial<MasterState> {
  const state = persisted && typeof persisted === 'object' ? (persisted as Partial<MasterState>) : {};
  const profile = state.profile && !hasBrokenText(state.profile) ? state.profile : defaultProfile;

  return {
    ...state,
    profile,
    lessons: hasBrokenText(state.lessons) ? defaultLessons : state.lessons ?? defaultLessons,
    students: hasBrokenText(state.students) ? defaultStudents : state.students ?? defaultStudents,
    classRecords: hasBrokenText(state.classRecords) ? [] : state.classRecords ?? [],
    notifications: hasBrokenText(state.notifications) ? defaultNotifications : state.notifications ?? defaultNotifications,
    cart: hasBrokenText(state.cart) ? [] : state.cart ?? [],
  };
}

function applyStudentRecord(student: StudentProfile, record: ClassStudentRecord, classRecord: ClassRecord): StudentProfile {
  const attended = record.attendance === 'present';
  const missed = record.attendance === 'absent';
  const nextClasses = attended ? student.classes + 1 : student.classes;
  const nextAttendance = missed ? Math.max(0, student.attendance - 2) : attended ? Math.min(100, student.attendance + 1) : student.attendance;
  const today = new Date(classRecord.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  const skillSet = new Set(record.skills);
  const nextSkills = student.skills.map((skill) => (skillSet.has(skill.label) ? { ...skill, value: Math.min(100, skill.value + 3), delta: '+3%' } : skill));
  const addedSkills = record.skills.filter((skill) => !student.skills.some((item) => item.label === skill)).map<StudentProfile['skills'][number]>((label) => ({ label, value: 44, delta: '+3%' }));
  const memoSuffix = record.memo ? ` / ${record.memo}` : '';
  const historyLine = missed
    ? `${today} ${classRecord.programTitle} 결석${memoSuffix}`
    : `${today} ${classRecord.programTitle} ${record.skills.length}개 기록${record.focused ? ' / 집중 관찰' : ''}${memoSuffix}`;
  const badgeEarned = nextClasses >= 20 && !student.badges.includes('수업 기록 누적');

  return {
    ...student,
    classes: nextClasses,
    attendance: nextAttendance,
    streak: attended ? student.streak + 1 : missed ? 0 : student.streak,
    risk: missed ? '최근 결석 기록 확인 필요' : record.focused ? '다음 수업 집중 관찰 필요' : student.risk,
    skills: [...nextSkills, ...addedSkills],
    badges: badgeEarned ? ['수업 기록 누적', ...student.badges] : student.badges,
    history: [historyLine, ...student.history].slice(0, 8),
  };
}

export const useMasterStore = create<MasterState>()(
  persist(
    (set, get) => ({
      programs: [],
      programsLoaded: false,
      loadPrograms: async () => {
        if (get().programsLoaded) return;
        await get().reloadPrograms();
      },
      reloadPrograms: async () => {
        try {
          const res = await fetch('/api/spokedu-master/programs', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json() as { data?: Program[] };
            if (Array.isArray(json.data) && json.data.length > 0) {
              set({ programs: enrichProgramsWithStaticVisuals(json.data), programsLoaded: true });
              return;
            }
          }
        } catch {
          if (get().programsLoaded && get().programs.length > 0) return;
        }
        if (!get().programsLoaded || get().programs.length === 0) {
          set({ programs: STATIC_PROGRAMS, programsLoaded: true });
        }
      },
      drills: [],
      drillsLoaded: false,
      loadDrills: async () => {
        if (get().drillsLoaded) return;
        try {
          const res = await fetch('/api/spokedu-master/drills');
          if (!res.ok) {
            set({ drills: STATIC_DRILLS, drillsLoaded: true });
            return;
          }
          const json = await res.json() as { data?: Drill[] };
          if (Array.isArray(json.data) && json.data.length > 0) {
            const usable = json.data;
            if (usable.length > 0) {
              set({ drills: usable, drillsLoaded: true });
              return;
            }
          }
        } catch {
          // Keep static fallback when the network is unavailable.
        }
        set({ drills: STATIC_DRILLS, drillsLoaded: true });
      },
      profile: defaultProfile,
      setProfile: (profile) => set((state) => ({ profile: state.profile ? { ...state.profile, ...profile } : { ...defaultProfile, ...profile } })),
      resetProfile: () => set({ profile: { ...defaultProfile, trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString() } }),
      syncSubscription: async () => {
        try {
          const res = await fetch('/api/spokedu-master/subscription');
          if (!res.ok) return;
          const json = await res.json() as { plan?: string; status?: string; isAdmin?: boolean; userId?: string; email?: string | null; trialEndsAt?: string | null };
          const serverPlan: 'free' | 'pro' | 'team' =
            json.isAdmin ? 'team' :
            json.status === 'active' && json.plan === 'team' ? 'team' :
            json.status === 'active' && json.plan === 'pro' ? 'pro' : 'free';
          set((state) => ({
            profile: state.profile
              ? {
                  ...state.profile,
                  plan: serverPlan,
                  role: serverPlan === 'team' ? 'director' : 'teacher',
                  isAdmin: json.isAdmin ?? false,
                  ...(json.userId ? { id: json.userId } : {}),
                  ...(json.email ? { email: json.email } : {}),
                  trialEndsAt: json.isAdmin ? null : (json.trialEndsAt ?? state.profile.trialEndsAt),
                }
              : state.profile,
          }));
        } catch {
          // Keep current plan when offline.
        }
      },
      operational: defaultOperational,
      setOnline: (online) => set((state) => ({ operational: { ...state.operational, online } })),
      setLastSyncNow: () => set((state) => ({ operational: { ...state.operational, lastSyncAt: new Date().toISOString() } })),
      enqueueRetry: (item) => set((state) => ({ operational: { ...state.operational, retryQueue: [item, ...state.operational.retryQueue.filter((queued) => queued.id !== item.id)].slice(0, 30) } })),
      removeRetry: (id) => set((state) => ({ operational: { ...state.operational, retryQueue: state.operational.retryQueue.filter((item) => item.id !== id) } })),
      sessions: [],
      addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions].slice(0, 200), operational: { ...state.operational, lastSyncAt: new Date().toISOString() } })),
      activeSession: null,
      startSession: (drillId, drillName) => set({ activeSession: { drillId, drillName, times: [], cueCount: 0, running: true, paused: false } }),
      recordTime: (ms) => set((state) => (state.activeSession ? { activeSession: { ...state.activeSession, times: [...state.activeSession.times, ms], cueCount: state.activeSession.cueCount + 1 } } : {})),
      pauseSession: () => set((state) => ({ activeSession: state.activeSession ? { ...state.activeSession, paused: true } : null })),
      resumeSession: () => set((state) => ({ activeSession: state.activeSession ? { ...state.activeSession, paused: false } : null })),
      endActiveSession: () => {
        const { activeSession, addSession } = get();
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
      addLesson: (lesson) => set((state) => ({ lessons: [...state.lessons, lesson] })),
      toggleLessonDone: (id) => set((state) => ({ lessons: state.lessons.map((lesson) => (lesson.id === id ? { ...lesson, done: !lesson.done } : lesson)) })),
      deleteLessonById: (id) => set((state) => ({ lessons: state.lessons.filter((lesson) => lesson.id !== id) })),
      students: defaultStudents,
      addStudent: (name, group, meta, id) => set((state) => ({
        students: [...state.students, { id: id ?? Date.now().toString(), name, group, meta, level: 'Lv.1 Start', attendance: 100, classes: 0, streak: 0, risk: null, skills: [], badges: [], history: [] }],
      })),
      removeStudent: (id) => set((state) => ({ students: state.students.filter((student) => student.id !== id) })),
      classRecords: [],
      saveClassRecord: (record) =>
        set((state) => ({
          classRecords: [record, ...state.classRecords.filter((item) => item.id !== record.id)].slice(0, 100),
          students: state.students.map((student) => {
            const studentRecord = record.students.find((item) => item.studentId === student.id);
            return studentRecord ? applyStudentRecord(student, studentRecord, record) : student;
          }),
          notifications: [
            {
              id: `record-${record.id}`,
              type: 'report' as const,
              title: `${record.classId} 수업 기록 저장`,
              body: `${record.programTitle} 기록 ${record.skillCount}개가 학생 이력에 반영되었습니다.`,
              read: false,
              createdAt: record.date,
            },
            ...state.notifications,
          ].slice(0, 50),
          operational: { ...state.operational, lastSyncAt: new Date().toISOString() },
        })),
      favorites: [],
      toggleFavorite: (id) => set((state) => ({ favorites: state.favorites.includes(id) ? state.favorites.filter((favorite) => favorite !== id) : [...state.favorites, id] })),
      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((cartItem) => cartItem.id === item.id);
          return { cart: existing ? state.cart.map((cartItem) => (cartItem.id === item.id ? { ...cartItem, qty: cartItem.qty + item.qty } : cartItem)) : [...state.cart, item] };
        }),
      updateQty: (id, delta) => set((state) => ({ cart: state.cart.map((cartItem) => (cartItem.id === id ? { ...cartItem, qty: cartItem.qty + delta } : cartItem)).filter((cartItem) => cartItem.qty > 0) })),
      clearCart: () => set({ cart: [] }),
      notifications: defaultNotifications,
      markRead: (id) => set((state) => ({ notifications: state.notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)) })),
      markAllRead: () => set((state) => ({ notifications: state.notifications.map((notification) => ({ ...notification, read: true })) })),
      classTimerMs: 0,
      classTimerRunning: false,
      classTimerStartedAt: null,
      classTimerStart: () => set((state) => {
        if (state.classTimerRunning) return {};
        return { classTimerRunning: true, classTimerStartedAt: Date.now() };
      }),
      classTimerStop: () => set((state) => {
        if (!state.classTimerRunning) return {};
        return { classTimerRunning: false, classTimerMs: state.classTimerMs + (state.classTimerStartedAt ? Date.now() - state.classTimerStartedAt : 0), classTimerStartedAt: null };
      }),
      classTimerReset: () => set({ classTimerMs: 0, classTimerRunning: false, classTimerStartedAt: null }),
    }),
    {
      name: 'spokedu-master-store',
      version: 9,
      migrate: migrateMasterStore,
      partialize: (state) => ({
        profile: state.profile,
        operational: state.operational,
        sessions: state.sessions,
        lessons: state.lessons,
        students: state.students,
        classRecords: state.classRecords,
        favorites: state.favorites,
        cart: state.cart,
        notifications: state.notifications,
      }),
    },
  ),
);

export const useProfile = () => useMasterStore((state) => state.profile);
export const useOperationalStatus = () => useMasterStore((state) => state.operational);
export const useIsPro = () => useMasterStore((state) => hasMasterAccess(state.profile));
export const useCartCount = () => useMasterStore((state) => state.cart.reduce((total, item) => item.qty + total, 0));
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
