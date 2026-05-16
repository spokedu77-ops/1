'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { RetryQueueItem } from '../lib/serviceContracts';
import type { CartItem, ClassRecord, ClassStudentRecord, Drill, Lesson, Notification, Program, Session, StudentProfile, UserProfile } from '../types';
import { DRILLS as STATIC_DRILLS, PROGRAMS as STATIC_PROGRAMS } from '../lib/data';

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
  drills: Drill[];
  drillsLoaded: boolean;
  loadDrills: () => Promise<void>;
  profile: UserProfile | null;
  setProfile: (profile: Partial<UserProfile>) => void;
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

const defaultLessons: Lesson[] = [
  {
    id: 1,
    title: '8자 드릴: 민첩성 트레이닝',
    classId: '오늘 수업',
    date: new Date().toISOString(),
    period: 3,
    duration: 15,
    done: false,
    color: '#6366f1',
    memo: 'SPOMOVE 방향 전환과 연결하기 좋은 추천 수업',
  },
  {
    id: 2,
    title: '밸런스 로드',
    classId: '다음 수업',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    period: 4,
    duration: 18,
    done: false,
    color: '#10b981',
  },
];

const defaultStudents: StudentProfile[] = [
  {
    id: 'minjun',
    name: '김민준',
    group: '초등 A반',
    meta: '8세 / 3개월차',
    level: 'Lv.4 Balance',
    attendance: 92,
    classes: 18,
    streak: 4,
    risk: '다음 수업에서 균형 자세 확인 필요',
    skills: [
      { label: '균형 유지', value: 74, delta: '+12%' },
      { label: '방향 전환', value: 61, delta: '+6%' },
      { label: '멈춤 반응', value: 42, delta: '유지' },
    ],
    badges: ['균형 마스터', '출석 루틴'],
    history: ['5.11 8자 드릴 출석', '5.04 멈춤 반응 관찰', '4.27 균형 마스터 배지'],
  },
  {
    id: 'seoyeon',
    name: '이서연',
    group: '초등 A반',
    meta: '9세 / 5개월차',
    level: 'Lv.5 Focus',
    attendance: 98,
    classes: 24,
    streak: 9,
    risk: null,
    skills: [
      { label: '신호 반응', value: 88, delta: '+18%' },
      { label: '협응 리듬', value: 81, delta: '+10%' },
      { label: '방향 전환', value: 76, delta: '+9%' },
    ],
    badges: ['집중왕', '연속 출석'],
    history: ['5.11 밸런스 로드 우수', '5.04 집중왕 배지', '4.27 리듬 과제 완료'],
  },
  {
    id: 'jiho',
    name: '박지호',
    group: '초등 A반',
    meta: '8세 / 2개월차',
    level: 'Lv.3 Agility',
    attendance: 86,
    classes: 13,
    streak: 1,
    risk: '최근 결석 기록 확인 필요',
    skills: [
      { label: '방향 전환', value: 69, delta: '+8%' },
      { label: '출발 반응', value: 58, delta: '+4%' },
      { label: '집중 유지', value: 47, delta: '-2%' },
    ],
    badges: ['첫 리포트'],
    history: ['5.11 결석', '5.04 결석', '4.27 방향 전환 개선'],
  },
];

const defaultNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'program',
    title: '이번 주 추천 프로그램이 준비됐습니다.',
    body: '라이브러리에서 수업 전 바로 쓸 수 있는 추천 수업안을 확인하세요.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    type: 'billing',
    title: '체험 기간이 활성화되어 있습니다.',
    body: '첫 상용 버전에서는 라이브러리, SPOMOVE, 수업 설명 도구를 중심으로 사용할 수 있습니다.',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

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
  const historyLine = missed ? `${today} ${classRecord.programTitle} 결석${memoSuffix}` : `${today} ${classRecord.programTitle} ${record.skills.length}개 기록${record.focused ? ' / 집중 관찰' : ''}${memoSuffix}`;
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
      programs: STATIC_PROGRAMS,
      programsLoaded: false,
      loadPrograms: async () => {
        if (get().programsLoaded) return;
        try {
          const res = await fetch('/api/spokedu-master/programs');
          if (!res.ok) return;
          const json = await res.json() as { data?: Program[] };
          if (Array.isArray(json.data) && json.data.length > 0) {
            set({ programs: json.data, programsLoaded: true });
          }
        } catch {
          // keep static fallback
        }
      },
      drills: STATIC_DRILLS,
      drillsLoaded: false,
      loadDrills: async () => {
        if (get().drillsLoaded) return;
        try {
          const res = await fetch('/api/spokedu-master/drills');
          if (!res.ok) return;
          const json = await res.json() as { data?: Drill[] };
          if (Array.isArray(json.data) && json.data.length > 0) {
            set({ drills: json.data, drillsLoaded: true });
          }
        } catch {
          // keep static fallback
        }
      },
      profile: defaultProfile,
      setProfile: (profile) => set((state) => ({ profile: state.profile ? { ...state.profile, ...profile } : { ...defaultProfile, ...profile } })),
      syncSubscription: async () => {
        try {
          const res = await fetch('/api/spokedu-master/subscription');
          if (!res.ok) return;
          const json = await res.json() as { plan?: string; status?: string };
          // Always apply the server-authoritative plan — never trust localStorage alone
          const serverPlan: 'free' | 'pro' | 'team' =
            json.status === 'active' && json.plan === 'team' ? 'team' :
            json.status === 'active' && json.plan === 'pro' ? 'pro' : 'free';
          set((state) => ({
            profile: state.profile
              ? {
                  ...state.profile,
                  plan: serverPlan,
                  role: serverPlan === 'team' ? 'director' : 'teacher',
                }
              : state.profile,
          }));
        } catch {
          // network failure — keep current plan (offline tolerance)
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
    }),
    {
      name: 'spokedu-master-store',
      version: 8,
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
    }
  )
);

export const useProfile = () => useMasterStore((state) => state.profile);
export const useOperationalStatus = () => useMasterStore((state) => state.operational);
export const useIsPro = () => useMasterStore((state) => (state.profile?.plan ?? 'free') !== 'free');
export const useCartCount = () => useMasterStore((state) => state.cart.reduce((total, item) => item.qty + total, 0));
export const useUnreadCount = () => useMasterStore((state) => state.notifications.filter((notification) => !notification.read).length);
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
    })
  );
