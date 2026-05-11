import type { ElementType } from 'react';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';

export type ViewId = 'home' | 'library' | 'spomove' | 'plan' | 'report' | 'shop' | 'billing' | 'onboarding' | 'ops';

export type Program = {
  id: string;
  title: string;
  category: string;
  audience: string;
  minutes: number;
  status: 'free' | 'pro';
  description: string;
  tags: string[];
  colors: [string, string, string, string];
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  compareAt?: number;
  label: string;
  description: string;
  compatible?: boolean;
  featured?: boolean;
  colors: [string, string];
};

export type ApiProgramRow = {
  id: number;
  title?: string | null;
  function_type?: string | null;
  function_types?: string[] | null;
  main_theme?: string | null;
  group_size?: string | null;
  equipment?: string | null;
  lesson_detail?: {
    subtitle?: string | null;
    package_keys?: string[] | null;
    is_featured_lesson?: boolean | null;
  } | null;
};

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
export type Plan = 'free' | 'basic' | 'pro';

export type ProContextSummary = {
  activeCenterId: string | null;
  centers: Array<{ id: string; name: string; role: string }>;
  entitlement: { plan: Plan; status: SubscriptionStatus; isPro: boolean };
  billing: {
    priceKrw: number;
    promoPriceKrw: number | null;
    currentPeriodEndAt: string | null;
    stripeCustomerId: string | null;
  };
  usage: {
    studentCount: number;
    aiReportThisMonth: number;
    aiReportMonthlyLimit: number | null;
    classCount: number;
    classLimit: number | null;
  };
};

export type AdminSubscriptionRow = {
  centerId: string;
  centerName: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string | null;
};

export const NAV: Array<{ id: ViewId; label: string; caption: string; icon: ElementType }> = [
  { id: 'home', label: '홈', caption: '오늘 운영 요약', icon: Home },
  { id: 'library', label: '수업 라이브러리', caption: '프로그램 탐색', icon: BookOpen },
  { id: 'spomove', label: 'SPOMOVE', caption: '반응훈련 실행', icon: Zap },
  { id: 'plan', label: '수업 계획', caption: '일정과 준비', icon: CalendarDays },
  { id: 'report', label: '성장 리포트', caption: '학부모 공유', icon: FileText },
  { id: 'shop', label: '교구 샵', caption: '추천 장비', icon: ShoppingBag },
  { id: 'billing', label: '구독/결제', caption: '플랜 관리', icon: CreditCard },
  { id: 'onboarding', label: '온보딩', caption: '초기 설정', icon: Sparkles },
  { id: 'ops', label: '관리자 도구', caption: '운영 링크', icon: LayoutDashboard },
];

export const PROGRAMS: Program[] = [
  {
    id: 'figure-8',
    title: '8자 서클',
    category: '민첩성',
    audience: '초등 저학년',
    minutes: 15,
    status: 'free',
    description: '방향 전환과 시야 추적을 함께 연습하는 기본 민첩성 수업입니다.',
    tags: ['방향전환', '마커콘', '실내 가능'],
    colors: ['#243c5a', '#2563eb', '#0f766e', '#14b8a6'],
  },
  {
    id: 'forest',
    title: '포레스트 무브먼트',
    category: '상상 대체육',
    audience: '유치부',
    minutes: 25,
    status: 'pro',
    description: '자연물 이미지를 활용해 반응, 이동, 역할 놀이를 연결하는 테마 수업입니다.',
    tags: ['상상놀이', '감각', '참여형'],
    colors: ['#064e3b', '#047857', '#16a34a', '#86efac'],
  },
  {
    id: 'focus',
    title: '포커스 서클',
    category: '순발력',
    audience: '초등 고학년',
    minutes: 15,
    status: 'pro',
    description: '색상과 방향 신호에 반응하며 집중 유지 시간을 짧게 측정합니다.',
    tags: ['SPOMOVE', '집중력', '기록'],
    colors: ['#1e1b4b', '#4f46e5', '#7c3aed', '#a78bfa'],
  },
  {
    id: 'balance',
    title: '밸런스 로드',
    category: '균형감',
    audience: '초등 저학년',
    minutes: 18,
    status: 'pro',
    description: '균형 경로를 따라 이동하며 자세 조절과 시야 고정을 연습합니다.',
    tags: ['균형', '자세조절', '적응'],
    colors: ['#14532d', '#166534', '#22c55e', '#bbf7d0'],
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'reaction-ball',
    name: '반응훈련 볼 세트',
    brand: 'SKLZ',
    price: 28000,
    compareAt: 35000,
    label: 'SPOMOVE 호환',
    description: '반응속도 수업과 기록 세션에 바로 연결할 수 있는 기본 교구입니다.',
    compatible: true,
    featured: true,
    colors: ['#164e63', '#0ea5e9'],
  },
  {
    id: 'hurdle',
    name: '미니 허들 6개 세트',
    brand: 'Perform Better',
    price: 42000,
    compareAt: 52000,
    label: '추천',
    description: '점프, 민첩성, 적응 수업에 반복 사용하기 좋은 장비입니다.',
    featured: true,
    colors: ['#713f12', '#f59e0b'],
  },
  {
    id: 'tripod',
    name: '스마트폰 삼각대 거치대',
    brand: 'Joby',
    price: 19900,
    label: 'NEW',
    description: '수업 기록 영상과 리포트 피드백 촬영을 안정적으로 돕습니다.',
    compatible: true,
    colors: ['#065f46', '#10b981'],
  },
  {
    id: 'cones',
    name: '컬러 마커콘 20개 세트',
    brand: 'Cawila',
    price: 15500,
    compareAt: 18000,
    label: '기본 교구',
    description: '동선, 대기 구역, 스테이션 경계를 빠르게 만드는 필수 교구입니다.',
    compatible: true,
    colors: ['#5b21b6', '#8b5cf6'],
  },
];

export const REPORTS = [
  { name: '김서윤', group: '3학년 A반', avg: 328, best: 241, attendance: 96, delta: -42, state: '발송 준비' },
  { name: '이서준', group: '3학년 A반', avg: 352, best: 260, attendance: 91, delta: -28, state: '작성 중' },
  { name: '박도윤', group: '3학년 B반', avg: 301, best: 222, attendance: 98, delta: -55, state: '발송 완료' },
];

export const LESSONS = [
  { date: '5.11 월', time: '3교시', group: '3학년 A반', title: '8자 서클', status: '준비 필요', color: '#2563eb' },
  { date: '5.12 화', time: '4교시', group: '3학년 B반', title: '포커스 서클', status: 'SPOMOVE', color: '#7c3aed' },
  { date: '5.13 수', time: '2교시', group: '4학년 A반', title: '밸런스 로드', status: '완료', color: '#16a34a' },
  { date: '5.15 금', time: '3교시', group: '3학년 A반', title: '팀 릴레이', status: '예정', color: '#f59e0b' },
];

export const CUES = [
  { symbol: '<', label: '왼쪽', color: '#1e1b4b' },
  { symbol: '>', label: '오른쪽', color: '#0f172a' },
  { symbol: '^', label: '앞으로', color: '#064e3b' },
  { symbol: 'v', label: '뒤로', color: '#713f12' },
  { symbol: '1', label: '1번', color: '#164e63' },
];

export const SPOMOVE_RUNS = [
  {
    title: '스피드 트랙',
    mode: 'basic',
    level: 1,
    desc: '가장 빠르게 체험 가능한 기본 색상 반응 세션입니다.',
    lesson: '도입 3분 집중 전환',
  },
  {
    title: '방향 전환',
    mode: 'spatial',
    level: 1,
    desc: '화면의 방향을 보고 실제 공간 위치로 이동하는 수업 전환 세션입니다.',
    lesson: '민첩성 수업 전 준비',
  },
  {
    title: '복합 신호',
    mode: 'stroop',
    level: 1,
    desc: '색상과 의미가 충돌할 때 반응 조절을 연습하는 고난도 세션입니다.',
    lesson: '고학년 집중 과제',
  },
];

export const ADMIN_TASKS: Array<{
  title: string;
  desc: string;
  href: string;
  icon: ElementType;
  status: string;
  tone: 'blue' | 'green' | 'amber' | 'slate';
}> = [
  {
    title: '구독 운영',
    desc: '센터별 플랜, 결제 상태, 체험 만료를 관리합니다.',
    href: '/admin/spokedu-pro/subscriptions',
    icon: CreditCard,
    status: '실데이터',
    tone: 'blue',
  },
  {
    title: '리드 관리',
    desc: '문의와 상담 전환 흐름을 확인합니다.',
    href: '/admin/spokedu-pro/leads',
    icon: Inbox,
    status: '운영',
    tone: 'green',
  },
  {
    title: '프로그램 업로드',
    desc: 'CSV 기반 수업안과 커리큘럼 데이터를 갱신합니다.',
    href: '/admin/spokedu-pro/upload',
    icon: Upload,
    status: '관리자',
    tone: 'amber',
  },
  {
    title: '수업안 보조정보',
    desc: '수업 설명, 현장 팁, 교구 정보를 보강합니다.',
    href: '/admin/spokedu-pro/lesson-details',
    icon: FileText,
    status: '콘텐츠',
    tone: 'slate',
  },
];

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: '체험 중',
  active: '활성',
  past_due: '결제 지연',
  canceled: '해지',
  expired: '만료',
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'PRO',
};
