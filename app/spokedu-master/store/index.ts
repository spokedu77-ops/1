'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Lesson, Notification, Session, UserProfile } from '../types';

type ActiveSession = {
  drillId: string;
  drillName: string;
  times: number[];
  cueCount: number;
  running: boolean;
  paused: boolean;
};

interface MasterState {
  profile: UserProfile | null;
  setProfile: (profile: Partial<UserProfile>) => void;

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
  createdAt: new Date().toISOString(),
};

const defaultLessons: Lesson[] = [
  {
    id: 1,
    title: '8자 드릴 - 민첩성 트레이닝',
    classId: '3학년 A반',
    date: new Date().toISOString(),
    period: 3,
    duration: 15,
    done: false,
    color: '#6366f1',
    memo: 'SPOMOVE 방향 전환 연결',
  },
  {
    id: 2,
    title: '포커스 서클',
    classId: '3학년 B반',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    period: 4,
    duration: 15,
    done: false,
    color: '#10b981',
  },
];

const defaultNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'program',
    title: '"포레스트 무브먼트" 외 3개 추가됨',
    body: '이번 주 신규 프로그램이 업데이트됐어요.',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    type: 'report',
    title: '3학년 A반 리포트 완성',
    body: '5월 2주차 에듀에코 리포트가 준비됐어요.',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useMasterStore = create<MasterState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      setProfile: (profile) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...profile } : { ...defaultProfile, ...profile },
        })),

      sessions: [],
      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 200),
        })),

      activeSession: null,
      startSession: (drillId, drillName) =>
        set({
          activeSession: { drillId, drillName, times: [], cueCount: 0, running: true, paused: false },
        }),
      recordTime: (ms) =>
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              times: [...state.activeSession.times, ms],
              cueCount: state.activeSession.cueCount + 1,
            },
          };
        }),
      pauseSession: () =>
        set((state) => ({
          activeSession: state.activeSession ? { ...state.activeSession, paused: true } : null,
        })),
      resumeSession: () =>
        set((state) => ({
          activeSession: state.activeSession ? { ...state.activeSession, paused: false } : null,
        })),
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
      toggleLessonDone: (id) =>
        set((state) => ({
          lessons: state.lessons.map((lesson) => (lesson.id === id ? { ...lesson, done: !lesson.done } : lesson)),
        })),
      deleteLessonById: (id) =>
        set((state) => ({
          lessons: state.lessons.filter((lesson) => lesson.id !== id),
        })),

      favorites: [],
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((favorite) => favorite !== id)
            : [...state.favorites, id],
        })),

      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((cartItem) => cartItem.id === item.id);
          return {
            cart: existing
              ? state.cart.map((cartItem) =>
                  cartItem.id === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
                )
              : [...state.cart, item],
          };
        }),
      updateQty: (id, delta) =>
        set((state) => ({
          cart: state.cart
            .map((cartItem) => (cartItem.id === id ? { ...cartItem, qty: cartItem.qty + delta } : cartItem))
            .filter((cartItem) => cartItem.qty > 0),
        })),
      clearCart: () => set({ cart: [] }),

      notifications: defaultNotifications,
      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
        })),
    }),
    {
      name: 'spokedu-master-store',
      partialize: (state) => ({
        profile: state.profile,
        sessions: state.sessions,
        lessons: state.lessons,
        favorites: state.favorites,
        cart: state.cart,
        notifications: state.notifications,
      }),
    }
  )
);

export const useProfile = () => useMasterStore((state) => state.profile);
export const useIsPro = () => useMasterStore((state) => (state.profile?.plan ?? 'free') !== 'free');
export const useCartCount = () => useMasterStore((state) => state.cart.reduce((total, item) => total + item.qty, 0));
export const useUnreadCount = () => useMasterStore((state) => state.notifications.filter((notification) => !notification.read).length);
export const useStats = () =>
  useMasterStore((state) => {
    const times = state.sessions.flatMap((session) => session.times);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    return {
      totalSessions: state.sessions.length,
      thisWeekSessions: state.sessions.filter((session) => new Date(session.date) > weekAgo).length,
      avgRT: times.length ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 0,
      bestRT: times.length ? Math.min(...times) : 0,
      totalCues: state.sessions.reduce((total, session) => total + session.cueCount, 0),
    };
  });
