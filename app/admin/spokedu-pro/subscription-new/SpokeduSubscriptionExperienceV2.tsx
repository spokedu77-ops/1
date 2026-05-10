'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  Loader2,
  MonitorPlay,
  Package,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Timer,
  Upload,
  X,
  Zap,
} from 'lucide-react';

type ViewId = 'home' | 'library' | 'spomove' | 'plan' | 'report' | 'shop' | 'billing' | 'onboarding' | 'ops';

type Program = {
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

type Product = {
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

type ApiProgramRow = {
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

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
type Plan = 'free' | 'basic' | 'pro';

type ProContextSummary = {
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

type AdminSubscriptionRow = {
  centerId: string;
  centerName: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string | null;
};

const NAV: Array<{ id: ViewId; label: string; caption: string; icon: React.ElementType }> = [
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

const PROGRAMS: Program[] = [
  {
    id: 'figure-8',
    title: '8자 드릴',
    category: '민첩성',
    audience: '초등 저학년',
    minutes: 15,
    status: 'free',
    description: '방향 전환과 시야 추적을 함께 훈련하는 기본 민첩성 수업입니다.',
    tags: ['방향전환', '마커콘', '실내 가능'],
    colors: ['#243c5a', '#2563eb', '#0f766e', '#14b8a6'],
  },
  {
    id: 'forest',
    title: '포레스트 무브먼트',
    category: '자연 테마',
    audience: '유치부',
    minutes: 25,
    status: 'pro',
    description: '자연물 이미지를 활용해 반응, 이동, 역할 놀이를 연결하는 테마형 수업입니다.',
    tags: ['자연물', '감각', '참여형'],
    colors: ['#064e3b', '#047857', '#16a34a', '#86efac'],
  },
  {
    id: 'focus',
    title: '포커스 드릴',
    category: '반응속도',
    audience: '초등 전학년',
    minutes: 15,
    status: 'pro',
    description: '색상과 방향 자극에 반응하며 집중 유지 시간을 짧게 측정합니다.',
    tags: ['SPOMOVE', '집중력', '기록'],
    colors: ['#1e1b4b', '#4f46e5', '#7c3aed', '#a78bfa'],
  },
  {
    id: 'balance',
    title: '밸런스 로드',
    category: '균형감각',
    audience: '초등 저학년',
    minutes: 18,
    status: 'pro',
    description: '균형 경로를 따라 이동하며 자세 조절과 시야 고정을 연습합니다.',
    tags: ['균형', '자세조절', '협응'],
    colors: ['#14532d', '#166534', '#22c55e', '#bbf7d0'],
  },
];

const PRODUCTS: Product[] = [
  {
    id: 'reaction-ball',
    name: '반응훈련 볼 세트',
    brand: 'SKLZ',
    price: 28000,
    compareAt: 35000,
    label: 'SPOMOVE 호환',
    description: '반응속도 수업과 기록 세션에 바로 연결되는 기본 교구입니다.',
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
    description: '점프, 민첩성, 협응 수업에 반복 사용하기 좋은 장비입니다.',
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
    description: '동선, 팀 구역, 스테이션 경계를 빠르게 만드는 필수 교구입니다.',
    compatible: true,
    colors: ['#5b21b6', '#8b5cf6'],
  },
];

const REPORTS = [
  { name: '김하윤', group: '3학년 A반', avg: 328, best: 241, attendance: 96, delta: -42, state: '발송 준비' },
  { name: '이서준', group: '3학년 A반', avg: 352, best: 260, attendance: 91, delta: -28, state: '작성 중' },
  { name: '박민재', group: '3학년 B반', avg: 301, best: 222, attendance: 98, delta: -55, state: '발송 완료' },
];

const LESSONS = [
  { date: '5.11 월', time: '3교시', group: '3학년 A반', title: '8자 드릴', status: '준비 필요', color: '#2563eb' },
  { date: '5.12 화', time: '4교시', group: '3학년 B반', title: '포커스 드릴', status: 'SPOMOVE', color: '#7c3aed' },
  { date: '5.13 수', time: '2교시', group: '4학년 A반', title: '밸런스 로드', status: '완료', color: '#16a34a' },
  { date: '5.15 금', time: '3교시', group: '3학년 A반', title: '팀 릴레이', status: '예정', color: '#f59e0b' },
];

const CUES = [
  { symbol: '<', label: '왼쪽', color: '#1e1b4b' },
  { symbol: '>', label: '오른쪽', color: '#0f172a' },
  { symbol: '^', label: '앞으로', color: '#064e3b' },
  { symbol: 'v', label: '뒤로', color: '#713f12' },
  { symbol: '1', label: '1번', color: '#164e63' },
];

const SPOMOVE_RUNS = [
  {
    title: '스피드 트래킹',
    mode: 'basic',
    level: 1,
    desc: '가장 빠르게 체험 가능한 기본 색상 반응 세션입니다.',
    lesson: '도입 3분 집중 전환',
  },
  {
    title: '방향 전환',
    mode: 'spatial',
    level: 1,
    desc: '화살표 방향을 보고 공간 위치로 이동하는 수업 전환용 세션입니다.',
    lesson: '민첩성 수업 전 준비',
  },
  {
    title: '복합 자극',
    mode: 'stroop',
    level: 1,
    desc: '색상과 의미가 충돌할 때 반응 조절을 연습하는 고난도 세션입니다.',
    lesson: '고학년 집중 과제',
  },
];

const ADMIN_TASKS: Array<{
  title: string;
  desc: string;
  href: string;
  icon: React.ElementType;
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

const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: '체험 중',
  active: '활성',
  past_due: '결제 지연',
  canceled: '해지',
  expired: '만료',
};

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'PRO',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function programColors(index: number): [string, string, string, string] {
  const palettes: [string, string, string, string][] = [
    ['#243c5a', '#2563eb', '#0f766e', '#14b8a6'],
    ['#1e1b4b', '#4f46e5', '#7c3aed', '#a78bfa'],
    ['#064e3b', '#047857', '#16a34a', '#86efac'],
    ['#713f12', '#f59e0b', '#be123c', '#fb7185'],
  ];
  return palettes[index % palettes.length] ?? palettes[0]!;
}

function mapApiProgram(row: ApiProgramRow, index: number): Program {
  const functionTypes =
    Array.isArray(row.function_types) && row.function_types.length > 0
      ? row.function_types.filter(Boolean)
      : row.function_type
        ? [row.function_type]
        : [];
  const tags = [row.main_theme, functionTypes[0], row.group_size].filter((x): x is string => Boolean(x?.trim())).slice(0, 3);
  return {
    id: String(row.id),
    title: row.title?.trim() || `프로그램 ${row.id}`,
    category: row.main_theme?.trim() || functionTypes[0]?.trim() || '수업 프로그램',
    audience: row.group_size?.trim() || '대상 설정 필요',
    minutes: 15,
    status: row.lesson_detail?.is_featured_lesson ? 'pro' : 'free',
    description:
      row.lesson_detail?.subtitle?.trim() ||
      (row.equipment?.trim() ? `사용 교구: ${row.equipment.trim()}` : '기존 Pro 라이브러리에서 불러온 수업안입니다.'),
    tags: tags.length > 0 ? tags : ['Pro 데이터'],
    colors: programColors(index),
  };
}

export default function SpokeduSubscriptionExperienceV2() {
  const [view, setView] = useState<ViewId>('home');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [programs, setPrograms] = useState<Program[]>(PROGRAMS);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [contextSummary, setContextSummary] = useState<ProContextSummary | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [adminSubscriptions, setAdminSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [adminSubscriptionsLoading, setAdminSubscriptionsLoading] = useState(true);
  const current = NAV.find((item) => item.id === view) ?? NAV[0];
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const addCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setCartOpen(true);
  };

  const syncCenter = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/spokedu-pro/programs/import-center?hardDelete=1', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success(`센터 커리큘럼 동기화 완료: updated ${json.updated ?? 0}, inserted ${json.inserted ?? 0}`);
    } catch (error) {
      toast.error(`동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchPrograms = async () => {
      setProgramsLoading(true);
      try {
        const res = await fetch('/api/spokedu-pro/programs?limit=24', { credentials: 'include' });
        const json = (await res.json().catch(() => ({}))) as { data?: ApiProgramRow[] };
        if (!res.ok || !Array.isArray(json.data)) throw new Error('programs fetch failed');
        const mapped = json.data.map(mapApiProgram).filter((program) => program.title.trim());
        if (!cancelled) setPrograms(mapped.length > 0 ? mapped : PROGRAMS);
      } catch {
        if (!cancelled) setPrograms(PROGRAMS);
      } finally {
        if (!cancelled) setProgramsLoading(false);
      }
    };
    void fetchPrograms();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchContext = async () => {
      setContextLoading(true);
      try {
        const res = await fetch('/api/spokedu-pro/context', { credentials: 'include' });
        const json = (await res.json().catch(() => null)) as ProContextSummary | null;
        if (!res.ok || !json) throw new Error('context fetch failed');
        if (!cancelled) setContextSummary(json);
      } catch {
        if (!cancelled) setContextSummary(null);
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    };
    void fetchContext();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchAdminSubscriptions = async () => {
      setAdminSubscriptionsLoading(true);
      try {
        const res = await fetch('/api/admin/spokedu-pro/subscriptions?limit=200', { credentials: 'include' });
        const json = (await res.json().catch(() => ({}))) as { ok?: boolean; rows?: AdminSubscriptionRow[] };
        if (!res.ok || !json.ok || !Array.isArray(json.rows)) throw new Error('subscriptions fetch failed');
        if (!cancelled) setAdminSubscriptions(json.rows);
      } catch {
        if (!cancelled) setAdminSubscriptions([]);
      } finally {
        if (!cancelled) setAdminSubscriptionsLoading(false);
      }
    };
    void fetchAdminSubscriptions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-[#dfe3ea] bg-white px-4 py-5 xl:block">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#1f5eff] text-sm font-black text-white">SP</div>
            <div>
              <p className="text-base font-black tracking-tight">SPOKEDU</p>
              <p className="text-xs font-bold text-[#7b8494]">Subscription workspace</p>
            </div>
          </div>
          <nav className="mt-7 space-y-1">
            {NAV.map(({ id, label, caption, icon: Icon }) => {
              const active = id === view;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    active ? 'bg-[#edf3ff] text-[#1546d0]' : 'text-[#667085] hover:bg-[#f3f5f8] hover:text-[#172033]'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{label}</span>
                    <span className="block truncate text-[11px] font-semibold text-[#98a2b3]">{caption}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-7 rounded-xl border border-[#dfe3ea] bg-[#fbfcfd] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Current plan</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="font-black">PRO</p>
                <p className="mt-0.5 text-xs font-semibold text-[#7b8494]">2026.06.09 갱신</p>
              </div>
              <span className="rounded-full bg-[#e8f7ee] px-2.5 py-1 text-xs font-black text-[#16884a]">Active</span>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/90 backdrop-blur-xl">
            <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#667085]">스포키듀 구독 NEW</p>
                <h1 className="truncate text-xl font-black tracking-tight">{current.label}</h1>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative hidden w-[320px] md:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="수업안, 학생, 교구 검색"
                    className="h-10 w-full rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#1f5eff] focus:bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={syncCenter}
                  disabled={syncing}
                  className="hidden h-10 items-center gap-2 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm font-black text-[#475467] hover:bg-[#f3f5f8] disabled:opacity-60 lg:inline-flex"
                >
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  동기화
                </button>
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative grid h-10 w-10 place-items-center rounded-lg border border-[#dfe3ea] bg-white text-[#475467] hover:bg-[#f3f5f8]"
                  aria-label="장바구니 열기"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-[#1f5eff] px-1.5 text-[10px] font-black text-white">
                      {cartCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/admin/spokedu-pro/subscriptions"
                  className="hidden h-10 items-center gap-2 rounded-lg bg-[#172033] px-3 text-sm font-black text-white sm:inline-flex"
                >
                  <CreditCard className="h-4 w-4" />
                  결제 관리
                </Link>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-[#eef1f5] px-3 py-2 xl:hidden">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`h-9 shrink-0 rounded-lg px-3 text-xs font-black ${
                    view === id ? 'bg-[#172033] text-white' : 'bg-[#f3f5f8] text-[#667085]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
            {view === 'home' && (
              <HomeView
                onGo={setView}
                onSync={syncCenter}
                syncing={syncing}
                programCount={programs.length}
                programsLoading={programsLoading}
                contextSummary={contextSummary}
                contextLoading={contextLoading}
              />
            )}
            {view === 'library' && <LibraryView query={query} programs={programs} loading={programsLoading} />}
            {view === 'spomove' && <SpomoveView />}
            {view === 'plan' && <PlanView onGo={setView} />}
            {view === 'report' && <ReportView />}
            {view === 'shop' && <ShopView onAdd={addCart} cart={cart} />}
            {view === 'billing' && (
              <BillingView
                onGo={setView}
                contextSummary={contextSummary}
                contextLoading={contextLoading}
                adminRows={adminSubscriptions}
                adminRowsLoading={adminSubscriptionsLoading}
              />
            )}
            {view === 'onboarding' && <OnboardingView onGo={setView} />}
            {view === 'ops' && <OpsView onSync={syncCenter} syncing={syncing} />}
          </div>
        </main>
      </div>
      {cartOpen && <CartDrawer cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function HomeView({
  onGo,
  onSync,
  syncing,
  programCount,
  programsLoading,
  contextSummary,
  contextLoading,
}: {
  onGo: (view: ViewId) => void;
  onSync: () => void;
  syncing: boolean;
  programCount: number;
  programsLoading: boolean;
  contextSummary: ProContextSummary | null;
  contextLoading: boolean;
}) {
  const plan = contextSummary?.entitlement.plan ?? 'free';
  const status = contextSummary?.entitlement.status ?? 'active';
  const renewalDate = formatDate(contextSummary?.billing.currentPeriodEndAt);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-[#1f5eff]">오늘의 수업 운영</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-[#172033]">
                수업 준비, SPOMOVE 실행, 리포트 공유를 한 곳에서 확인합니다.
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">
                기존 Pro의 실제 운영 링크를 유지하면서 새 구독 워크스페이스의 정보 구조를 비교할 수 있는 화면입니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onGo('spomove')} className="h-11 rounded-lg bg-[#1f5eff] px-4 text-sm font-black text-white">
                SPOMOVE 시작
              </button>
              <Link href="/admin/spokedu-pro" className="inline-flex h-11 items-center rounded-lg border border-[#dfe3ea] bg-white px-4 text-sm font-black">
                기존 Pro 열기
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="오늘 수업" value="4" note="2개 준비 필요" icon={CalendarDays} />
          <Stat label="리포트 대기" value="7" note="발송 전 검토" icon={FileText} />
          <Stat label="평균 반응" value="327ms" note="전주 대비 -42ms" icon={Timer} />
          <Stat label="수업안" value={programsLoading ? '...' : String(programCount)} note="Pro API 연결" icon={BookOpen} />
        </div>

        <Panel title="오늘 수업" action="수업 계획" onAction={() => onGo('plan')}>
          <div className="divide-y divide-[#eef1f5]">
            {LESSONS.slice(0, 3).map((lesson) => (
              <div key={lesson.title} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="h-10 w-1.5 rounded-full" style={{ background: lesson.color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{lesson.title}</p>
                  <p className="text-sm font-medium text-[#667085]">{lesson.date} · {lesson.time} · {lesson.group}</p>
                </div>
                <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-[#475467]">{lesson.status}</span>
              </div>
            ))}
          </div>
        </Panel>

        <section className="rounded-xl border border-[#dfe3ea] bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">Subscriber Experience</p>
              <h3 className="mt-2 text-xl font-black">구독자 전용 페이지도 같은 흐름으로 키웁니다.</h3>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#667085]">
                이 NEW 화면은 관리자용 비교판입니다. 실제 구독자는 `/spokedu-pro`에서 수업 준비, SPOMOVE, 리포트, 결제를 사용하고,
                관리자는 여기서 구독 운영과 콘텐츠 품질을 점검합니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href="/spokedu-pro" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-black text-white">
                구독자 페이지 보기
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={() => onGo('onboarding')} className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dfe3ea] bg-white px-4 text-sm font-black">
                온보딩 흐름
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <JourneyCard
              title="1. 가입/온보딩"
              desc="센터와 교사 정보를 만들고 첫 수업 준비까지 이어집니다."
              admin="관리자: 리드 승인, 체험 부여"
              user="구독자: 초기 설정"
            />
            <JourneyCard
              title="2. 수업 운영"
              desc="라이브러리에서 수업을 고르고 SPOMOVE와 리포트를 실행합니다."
              admin="관리자: 콘텐츠 품질 관리"
              user="구독자: 수업 실행"
            />
            <JourneyCard
              title="3. 구독 유지"
              desc="결제 상태, 교구 혜택, 리포트 사용량을 확인합니다."
              admin="관리자: 구독/결제 운영"
              user="구독자: 플랜 관리"
            />
          </div>
        </section>
      </section>

      <aside className="space-y-5">
        <Panel title="빠른 관리자 작업">
          <div className="space-y-2">
            <Quick label="센터 커리큘럼 동기화" caption="기존 Pro의 실제 import API 실행" icon={Database} onClick={onSync} busy={syncing} />
            <QuickLink label="구독 운영" caption="구독자와 결제 상태 관리" icon={CreditCard} href="/admin/spokedu-pro/subscriptions" />
            <QuickLink label="리드 관리" caption="문의와 상담 흐름 확인" icon={Inbox} href="/admin/spokedu-pro/leads" />
            <QuickLink label="프로그램 업로드" caption="수업안 CSV 업로드" icon={Upload} href="/admin/spokedu-pro/upload" />
          </div>
        </Panel>
        <Panel title="구독 요약" action="관리" onAction={() => onGo('billing')}>
          <div className="rounded-lg bg-[#172033] p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">SPOKEDU {contextLoading ? '...' : PLAN_LABEL[plan]}</p>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-black">활성</span>
            </div>
            <p className="mt-4 text-2xl font-black">{contextLoading ? '...' : `${money(contextSummary?.billing.priceKrw ?? 0)}원`}</p>
            <p className="mt-1 text-sm font-medium text-white/60">
              {STATUS_LABEL[status]} · 다음 결제일 {renewalDate}
            </p>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function LibraryView({ query, programs, loading }: { query: string; programs: Program[]; loading: boolean }) {
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return programs;
    return programs.filter((program) =>
      [program.title, program.category, program.audience, program.description, ...program.tags].join(' ').toLowerCase().includes(keyword)
    );
  }, [programs, query]);

  return (
    <Screen title="수업 라이브러리" desc="새 워크스페이스에서는 검색 결과와 수업 상세가 먼저 보이도록 단순하게 구성합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-3 md:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => <ProgramSkeleton key={index} />)
          ) : filtered.length > 0 ? (
            filtered.map((program) => <ProgramCard key={program.id} program={program} />)
          ) : (
            <div className="rounded-xl border border-[#dfe3ea] bg-white p-5 text-sm font-bold text-[#667085] md:col-span-2">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
        <Panel title="기존 Pro 연결">
          <p className="text-sm font-medium leading-6 text-[#667085]">
            다음 단계에서는 기존 Pro 라이브러리 데이터를 직접 연결합니다. 지금은 비교용 구조를 먼저 안정화합니다.
          </p>
          <Link href="/admin/spokedu-pro" className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#172033] text-sm font-black text-white">
            기존 Pro에서 확인
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Panel>
      </div>
    </Screen>
  );
}

function SpomoveView() {
  const [running, setRunning] = useState(false);
  const [cue, setCue] = useState(CUES[0]);
  const [times, setTimes] = useState<number[]>([]);
  const startRef = useRef(0);
  const avg = times.length ? Math.round(times.reduce((sum, item) => sum + item, 0) / times.length) : 0;
  const best = times.length ? Math.min(...times) : 0;

  const next = () => {
    if (running && startRef.current) {
      const rt = Math.round(performance.now() - startRef.current);
      if (rt > 50 && rt < 3000) setTimes((prev) => [...prev, rt]);
    }
    const selected = CUES[Math.floor(Math.random() * CUES.length)];
    setCue(selected);
    startRef.current = performance.now();
    setRunning(true);
  };

  return (
    <Screen title="SPOMOVE 반응훈련" desc="관리자는 실행 흐름과 콘텐츠 상태를 설계하고, 구독자는 /spokedu-pro에서 수업 중 바로 실행합니다.">
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Panel title="실행 경로">
            <div className="space-y-2">
              <QuickLink label="구독자 Pro에서 실행" caption="수업 중 사용하는 실제 진입점" icon={Zap} href="/spokedu-pro" />
              <QuickLink label="관리자 카탈로그" caption="전체 SPOMOVE 모드와 가이드 확인" icon={LayoutDashboard} href="/admin/iiwarmup/spomove/training" />
              <QuickLink label="Asset Hub" caption="색지각 이미지와 BGM 자산 관리" icon={Package} href="/admin/iiwarmup/assets" />
            </div>
          </Panel>

          <Panel title="추천 실행 세션">
            <div className="space-y-3">
              {SPOMOVE_RUNS.map((run, index) => (
                <SpomoveRunCard key={`${run.mode}-${run.level}`} run={run} active={index === 0} />
              ))}
            </div>
          </Panel>
        </aside>

        <section className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white">
          <div className="flex items-center justify-between border-b border-[#eef1f5] px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Prototype session</p>
              <h3 className="text-lg font-black">NEW 화면 내 빠른 테스트</h3>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/iiwarmup/spomove/training/_player?mode=basic&level=1&embed=1"
                className="hidden h-10 items-center rounded-lg bg-[#172033] px-3 text-sm font-black text-white sm:inline-flex"
              >
                엔진 직접 열기
              </Link>
              <button type="button" onClick={() => setRunning(false)} className="h-10 rounded-lg border border-[#ffd5d5] px-4 text-sm font-black text-[#c02a2a]">
                종료
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={next}
            className="flex min-h-[480px] w-full flex-col items-center justify-center text-white transition"
            style={{ background: running ? cue.color : '#172033' }}
          >
            {running ? (
              <>
                <span className="text-[150px] font-black leading-none sm:text-[210px]">{cue.symbol}</span>
                <span className="mt-4 text-2xl font-black tracking-[0.18em] text-white/70">{cue.label}</span>
              </>
            ) : (
              <>
                <Timer className="h-16 w-16" />
                <span className="mt-4 text-lg font-black tracking-[0.18em]">START</span>
              </>
            )}
          </button>
          <div className="grid grid-cols-3 gap-3 border-t border-[#eef1f5] p-4">
            <SmallMetric label="시도" value={String(times.length)} />
            <SmallMetric label="평균" value={avg ? `${avg}ms` : '-'} />
            <SmallMetric label="최고" value={best ? `${best}ms` : '-'} />
          </div>
        </section>

        <section className="rounded-xl border border-[#dfe3ea] bg-white p-4 xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="font-black">구독자 수업 흐름</h3>
              <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-[#667085]">
                NEW 관리자 화면에서 세션 구성을 점검하고, 실제 수업에서는 구독자가 `/spokedu-pro`의 라이브러리 또는 대시보드에서 SPOMOVE를 실행합니다.
                다음 구현 단계에서는 수업안의 연계 SPOMOVE ID를 이 탭의 추천 세션과 연결할 수 있습니다.
              </p>
            </div>
            <Link href="/spokedu-pro" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1f5eff] px-4 text-sm font-black text-white">
              구독자 수업 화면
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <FlowStep num="1" title="수업안 선택" desc="라이브러리에서 오늘 수업을 고릅니다." />
            <FlowStep num="2" title="SPOMOVE 실행" desc="추천 모드와 난이도를 전체 화면으로 띄웁니다." />
            <FlowStep num="3" title="현장 기록" desc="반응과 참여를 교사가 관찰합니다." />
            <FlowStep num="4" title="리포트 연결" desc="수업 후 성장 리포트의 근거로 씁니다." />
          </div>
        </section>
      </div>
    </Screen>
  );
}

function SpomoveRunCard({
  run,
  active,
}: {
  run: { title: string; mode: string; level: number; desc: string; lesson: string };
  active: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${active ? 'border-[#1f5eff] bg-[#edf3ff]' : 'border-[#dfe3ea] bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">{run.title}</p>
          <p className="mt-1 text-xs font-bold text-[#667085]">{run.lesson}</p>
        </div>
        <span className="rounded bg-white px-2 py-1 text-[10px] font-black text-[#475467] ring-1 ring-[#dfe3ea]">
          Lv.{run.level}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#667085]">{run.desc}</p>
      <Link
        href={`/admin/iiwarmup/spomove/training/_player?mode=${encodeURIComponent(run.mode)}&level=${encodeURIComponent(String(run.level))}&embed=1`}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#172033] text-xs font-black text-white"
      >
        엔진 테스트
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function FlowStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#edf3ff] text-xs font-black text-[#1f5eff]">{num}</span>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{desc}</p>
    </div>
  );
}

function PlanView({ onGo }: { onGo: (view: ViewId) => void }) {
  return (
    <Screen title="수업 계획" desc="주간 수업과 SPOMOVE 실행 진입점을 한 화면에 둡니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="주간 일정">
          <div className="grid gap-3">
            {LESSONS.map((lesson) => (
              <div key={lesson.title} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#dfe3ea] p-3">
                <div className="h-12 w-1.5 rounded-full" style={{ background: lesson.color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-black">{lesson.title}</p>
                  <p className="text-sm font-medium text-[#667085]">{lesson.date} · {lesson.time} · {lesson.group}</p>
                </div>
                <button type="button" onClick={() => onGo('spomove')} className="h-9 rounded-lg bg-[#172033] px-3 text-xs font-black text-white">
                  실행
                </button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="수업 추가">
          <div className="space-y-3">
            <Field label="반" value="3학년 A반" />
            <Field label="프로그램" value="8자 드릴" />
            <Field label="일정" value="2026.05.11 3교시" />
            <button type="button" className="h-11 w-full rounded-lg bg-[#1f5eff] text-sm font-black text-white">일정에 추가</button>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function ReportView() {
  return (
    <Screen title="성장 리포트" desc="학부모에게 공유할 결과와 발송 상태가 먼저 보이도록 구성합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="학생별 리포트">
          <div className="space-y-3">
            {REPORTS.map((report) => (
              <div key={report.name} className="rounded-lg border border-[#dfe3ea] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#edf3ff] text-sm font-black text-[#1f5eff]">{report.name[0]}</div>
                    <div>
                      <p className="font-black">{report.name}</p>
                      <p className="text-sm font-medium text-[#667085]">{report.group}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-[#475467]">{report.state}</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <SmallMetric label="평균" value={`${report.avg}ms`} />
                  <SmallMetric label="최고" value={`${report.best}ms`} />
                  <SmallMetric label="참여" value={`${report.attendance}%`} />
                  <SmallMetric label="개선" value={`${report.delta}ms`} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="공유 미리보기">
          <div className="rounded-xl bg-[#172033] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Parent report</p>
            <h3 className="mt-4 text-2xl font-black">김하윤 성장 리포트</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-white/70">
              반응속도와 참여율이 모두 개선되었습니다. 다음 주에는 방향 전환 과제를 조금 더 확장합니다.
            </p>
            <button type="button" className="mt-5 h-11 w-full rounded-lg bg-white text-sm font-black text-[#172033]">공유 링크 만들기</button>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function ShopView({ onAdd, cart }: { onAdd: (id: string) => void; cart: Record<string, number> }) {
  const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = PRODUCTS.find((item) => item.id === id);
    return sum + (product?.price ?? 0) * qty;
  }, 0);

  return (
    <Screen title="교구 샵" desc="V1의 장바구니 아이디어를 살려 추천 교구와 주문 요약을 비교할 수 있게 했습니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
            <p className="text-sm font-black text-[#1f5eff]">이번 주 추천 패키지</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-black">반응속도 집중 패키지</h3>
                <p className="mt-2 text-sm font-medium text-[#667085]">포커스 드릴, 8자 드릴, 리포트 촬영까지 한 번에 준비하는 구성입니다.</p>
              </div>
              <button type="button" onClick={() => PRODUCTS.filter((product) => product.compatible).forEach((product) => onAdd(product.id))} className="h-11 rounded-lg bg-[#1f5eff] px-4 text-sm font-black text-white">
                패키지 담기
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {PRODUCTS.map((product) => <ProductCard key={product.id} product={product} onAdd={() => onAdd(product.id)} />)}
          </div>
        </section>
        <Panel title="주문 요약">
          <div className="space-y-3">
            {Object.entries(cart).length === 0 ? (
              <p className="rounded-lg bg-[#f3f5f8] p-4 text-sm font-bold text-[#667085]">아직 담긴 교구가 없습니다.</p>
            ) : (
              Object.entries(cart).map(([id, qty]) => {
                const product = PRODUCTS.find((item) => item.id === id);
                if (!product) return null;
                return (
                  <div key={id} className="flex justify-between gap-3 text-sm font-bold">
                    <span className="text-[#475467]">{product.name} x {qty}</span>
                    <span>{money(product.price * qty)}원</span>
                  </div>
                );
              })
            )}
            <div className="border-t border-[#eef1f5] pt-3">
              <div className="flex justify-between font-black">
                <span>결제 예정 금액</span>
                <span>{money(subtotal)}원</span>
              </div>
            </div>
            <button type="button" className="h-11 w-full rounded-lg bg-[#172033] text-sm font-black text-white">주문으로 이동</button>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function BillingView({
  onGo,
  contextSummary,
  contextLoading,
  adminRows,
  adminRowsLoading,
}: {
  onGo: (view: ViewId) => void;
  contextSummary: ProContextSummary | null;
  contextLoading: boolean;
  adminRows: AdminSubscriptionRow[];
  adminRowsLoading: boolean;
}) {
  const currentPlan = contextSummary?.entitlement.plan ?? 'free';
  const currentStatus = contextSummary?.entitlement.status ?? 'active';
  const adminCounts = useMemo(() => {
    const counts: Record<SubscriptionStatus, number> = {
      trialing: 0,
      active: 0,
      past_due: 0,
      canceled: 0,
      expired: 0,
    };
    for (const row of adminRows) counts[row.status] += 1;
    return counts;
  }, [adminRows]);

  return (
    <Screen title="구독/결제" desc="새 화면에서는 결제 상태, 플랜 차이, 기존 운영 링크를 한 곳에 모읍니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="xl:col-span-2 grid gap-3 md:grid-cols-4">
          <Stat label="현재 플랜" value={contextLoading ? '...' : PLAN_LABEL[currentPlan]} note={STATUS_LABEL[currentStatus]} icon={CreditCard} />
          <Stat label="다음 결제일" value={contextLoading ? '...' : formatDate(contextSummary?.billing.currentPeriodEndAt)} note="현재 센터 기준" icon={CalendarDays} />
          <Stat label="학생 수" value={contextLoading ? '...' : String(contextSummary?.usage.studentCount ?? 0)} note="컨텍스트 API" icon={BookOpen} />
          <Stat label="AI 리포트" value={contextLoading ? '...' : String(contextSummary?.usage.aiReportThisMonth ?? 0)} note="이번 달 사용량" icon={FileText} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ['Free', '0원', '기본 체험', '기본 수업안 8개'],
            ['PRO', '29,000원', '교사 1인 구독', '153개 수업안 전체'],
            ['Teams', '문의', '기관/센터용', '교사 계정과 센터 통계'],
          ].map(([name, price, caption, feature]) => (
            <div key={name} className={`rounded-xl border p-5 ${name === 'PRO' ? 'border-[#1f5eff] bg-[#edf3ff]' : 'border-[#dfe3ea] bg-white'}`}>
              <p className="text-xl font-black">{name}</p>
              <p className="mt-3 text-3xl font-black">{price}</p>
              <p className="mt-4 text-sm font-bold text-[#475467]">{caption}</p>
              <p className="mt-2 text-sm font-medium text-[#667085]">{feature}</p>
              <button type="button" className={`mt-5 h-10 w-full rounded-lg text-sm font-black ${name === 'PRO' ? 'bg-[#1f5eff] text-white' : 'bg-[#172033] text-white'}`}>
                {name === 'PRO' ? '현재 플랜' : '선택'}
              </button>
            </div>
          ))}
        </div>
        <Panel title="결제 관리">
          <div className="space-y-3">
            <SmallMetric label="상태" value={contextLoading ? '...' : STATUS_LABEL[currentStatus]} />
            <SmallMetric label="다음 청구일" value={contextLoading ? '...' : formatDate(contextSummary?.billing.currentPeriodEndAt)} />
            <QuickLink label="기존 구독 운영" caption="상세 관리 페이지로 이동" icon={CreditCard} href="/admin/spokedu-pro/subscriptions" />
            <Quick label="교구 혜택 보기" caption="PRO 할인 적용" icon={ShoppingBag} onClick={() => onGo('shop')} />
          </div>
        </Panel>
        <Panel title="운영 현황">
          <div className="grid grid-cols-2 gap-2">
            <SmallMetric label="활성" value={adminRowsLoading ? '...' : String(adminCounts.active)} />
            <SmallMetric label="체험" value={adminRowsLoading ? '...' : String(adminCounts.trialing)} />
            <SmallMetric label="결제 지연" value={adminRowsLoading ? '...' : String(adminCounts.past_due)} />
            <SmallMetric label="전체" value={adminRowsLoading ? '...' : String(adminRows.length)} />
          </div>
          <div className="mt-4 space-y-2">
            {adminRows.slice(0, 3).map((row) => (
              <div key={row.centerId} className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3">
                <p className="truncate text-sm font-black">{row.centerName || row.centerId}</p>
                <p className="mt-1 text-xs font-bold text-[#667085]">
                  {PLAN_LABEL[row.plan]} · {STATUS_LABEL[row.status]} · {formatDate(row.currentPeriodEnd)}
                </p>
              </div>
            ))}
            {adminRows.length === 0 && !adminRowsLoading ? (
              <p className="rounded-lg bg-[#f3f5f8] p-3 text-sm font-bold text-[#667085]">운영 데이터를 불러오지 못했거나 항목이 없습니다.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function OnboardingView({ onGo }: { onGo: (view: ViewId) => void }) {
  return (
    <Screen title="온보딩" desc="구독자가 처음 들어왔을 때 오늘 수업까지 도달하는 최소 경로를 설계합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
            <p className="text-sm font-black text-[#1f5eff]">구독자 첫 진입</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight">설정은 짧게, 첫 수업 실행은 빠르게.</h3>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#667085]">
              관리자 NEW에서는 온보딩 구조를 검증하고, 실제 `/spokedu-pro`에서는 같은 흐름을 구독자 화면으로 제공합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/spokedu-pro" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-black text-white">
                구독자 화면에서 확인
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" onClick={() => onGo('library')} className="h-11 rounded-lg border border-[#dfe3ea] bg-white px-4 text-sm font-black">
                첫 수업 고르기
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <OnboardingStepCard
              step="01"
              title="센터 만들기"
              desc="기관명, 교사 역할, 기본 수업 대상을 정합니다."
              status="기존 bootstrap API 연결 후보"
            />
            <OnboardingStepCard
              step="02"
              title="첫 수업안 선택"
              desc="대상 연령과 공간에 맞는 추천 수업을 바로 보여줍니다."
              status="프로그램 API 연결됨"
            />
            <OnboardingStepCard
              step="03"
              title="SPOMOVE 테스트"
              desc="프로젝터/태블릿 환경에서 반응훈련이 잘 보이는지 확인합니다."
              status="실행 화면 연결 예정"
            />
            <OnboardingStepCard
              step="04"
              title="리포트 샘플 확인"
              desc="학부모에게 어떤 가치가 전달되는지 샘플 리포트로 보여줍니다."
              status="리포트 탭과 연결"
            />
          </div>
        </section>

        <aside className="space-y-5">
          <Panel title="초기 설정 미리보기">
            <div className="space-y-3">
              <Field label="교사 이름" value="김선생님" />
              <Field label="기관명" value="연세 체육교육 연구소" />
              <Field label="주 대상" value="초등 저학년" />
              <Field label="오늘의 목표" value="첫 수업 실행까지 5분" />
            </div>
            <button type="button" onClick={() => onGo('home')} className="mt-4 h-11 w-full rounded-lg bg-[#1f5eff] px-4 text-sm font-black text-white">
              설정 완료 시뮬레이션
            </button>
          </Panel>

          <Panel title="관리자 확인 포인트">
            <div className="space-y-3">
              <ChecklistItem title="체험 계정 생성" desc="리드 승인 후 체험 기간과 플랜이 정상 부여되는지 확인합니다." done />
              <ChecklistItem title="센터 선택 상태" desc="구독자가 로그인 후 활성 센터를 바로 갖는지 확인합니다." />
              <ChecklistItem title="첫 수업 CTA" desc="홈에서 라이브러리와 SPOMOVE로 바로 이어지는지 봅니다." done />
            </div>
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}

function OnboardingStepCard({ step, title, desc, status }: { step: string; title: string; desc: string; status: string }) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-sm font-black text-[#1f5eff]">{step}</span>
        <span className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-[11px] font-black text-[#667085]">{status}</span>
      </div>
      <h4 className="mt-4 text-lg font-black">{title}</h4>
      <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">{desc}</p>
    </div>
  );
}

function OpsView({ onSync, syncing }: { onSync: () => void; syncing: boolean }) {
  return (
    <Screen title="관리자 도구" desc="기존 Pro의 실제 관리 기능을 새 워크스페이스에서 찾기 쉽게 묶었습니다.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#dfe3ea] bg-white p-4 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-black">운영 작업판</h3>
              <p className="mt-1 text-sm font-medium text-[#667085]">기존 관리자 기능을 새 구독 워크스페이스의 작업 단위로 재배치했습니다.</p>
            </div>
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#172033] px-3 text-sm font-black text-white disabled:bg-[#dfe3ea] disabled:text-[#98a2b3]"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              센터 커리큘럼 동기화
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ADMIN_TASKS.map((task) => (
              <AdminTaskCard key={task.href} task={task} />
            ))}
          </div>
        </section>

        <Panel title="운영 체크리스트">
          <div className="space-y-3">
            <ChecklistItem title="신규 리드 확인" desc="상담 요청이 들어온 센터를 먼저 확인합니다." done={false} />
            <ChecklistItem title="체험 만료 점검" desc="trialing 센터의 만료일과 전환 상태를 확인합니다." done={false} />
            <ChecklistItem title="수업안 보조정보 보강" desc="대표 수업안부터 설명과 교구 정보를 채웁니다." done />
            <ChecklistItem title="구독 화면 비교" desc="기존 Pro와 NEW 화면의 정보 구조 차이를 검토합니다." done />
          </div>
        </Panel>

        <Panel title="프로젝터 모드">
          <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-[#172033] text-center text-white">
            <MonitorPlay className="h-12 w-12" />
            <p className="mt-4 text-2xl font-black">SPOMOVE 대형 화면</p>
            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-white/60">
              다음 단계에서 기존 SPOMOVE 실행 화면과 직접 연결합니다.
            </p>
          </div>
        </Panel>
        <Panel title="운영 지표">
          <div className="grid gap-3 sm:grid-cols-3">
            <SmallMetric label="총 수업" value="248" />
            <SmallMetric label="SPOMOVE" value="96" />
            <SmallMetric label="리포트" value="184" />
          </div>
          <div className="mt-4 h-40 rounded-lg bg-[#f3f5f8] p-4">
            <BarChart3 className="h-8 w-8 text-[#1f5eff]" />
            <p className="mt-10 text-sm font-bold text-[#667085]">일별 수업 빈도와 SPOMOVE 사용률을 추적할 자리입니다.</p>
          </div>
        </Panel>
        <Panel title="공유 흐름">
          <Share2 className="h-8 w-8 text-[#1f5eff]" />
          <p className="mt-4 text-xl font-black">학부모 공유 링크</p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">
            리포트 공유 미리보기와 링크 생성 흐름을 이 영역에 연결합니다.
          </p>
        </Panel>
      </div>
    </Screen>
  );
}

function AdminTaskCard({
  task,
}: {
  task: {
    title: string;
    desc: string;
    href: string;
    icon: React.ElementType;
    status: string;
    tone: 'blue' | 'green' | 'amber' | 'slate';
  };
}) {
  const Icon = task.icon;
  const toneClass = {
    blue: 'bg-[#edf3ff] text-[#1f5eff]',
    green: 'bg-[#e8f7ee] text-[#16884a]',
    amber: 'bg-[#fff4d7] text-[#9a6700]',
    slate: 'bg-[#f3f5f8] text-[#475467]',
  }[task.tone];

  return (
    <Link href={task.href} className="group flex min-h-[210px] flex-col rounded-xl border border-[#dfe3ea] bg-[#fbfcfd] p-4 transition hover:border-[#b9c4d4] hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#667085] ring-1 ring-[#dfe3ea]">{task.status}</span>
      </div>
      <h4 className="mt-4 text-base font-black">{task.title}</h4>
      <p className="mt-2 flex-1 text-sm font-medium leading-6 text-[#667085]">{task.desc}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-[#1f5eff]">
        열기
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function JourneyCard({ title, desc, admin, user }: { title: string; desc: string; admin: string; user: string }) {
  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-4">
      <h4 className="font-black">{title}</h4>
      <p className="mt-2 min-h-12 text-sm font-medium leading-6 text-[#667085]">{desc}</p>
      <div className="mt-4 space-y-1.5">
        <p className="rounded-md bg-white px-2.5 py-1.5 text-xs font-bold text-[#475467] ring-1 ring-[#dfe3ea]">{admin}</p>
        <p className="rounded-md bg-[#edf3ff] px-2.5 py-1.5 text-xs font-bold text-[#1546d0]">{user}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ title, desc, done = false }: { title: string; desc: string; done?: boolean }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3">
      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${done ? 'bg-[#e8f7ee] text-[#16884a]' : 'bg-[#edf3ff] text-[#1f5eff]'}`}>
        {done ? '✓' : '•'}
      </div>
      <div>
        <p className="text-sm font-black">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#667085]">{desc}</p>
      </div>
    </div>
  );
}

function CartDrawer({ cart, setCart, onClose }: { cart: Record<string, number>; setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>; onClose: () => void }) {
  const lines = Object.entries(cart)
    .map(([id, qty]) => {
      const product = PRODUCTS.find((item) => item.id === id);
      return product ? { product, qty } : null;
    })
    .filter((line): line is { product: Product; qty: number } => Boolean(line));
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);

  const update = (id: string, nextQty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (nextQty <= 0) delete next[id];
      else next[id] = nextQty;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/35 backdrop-blur-sm">
      <button type="button" aria-label="장바구니 닫기" className="absolute inset-0 cursor-default" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[#dfe3ea] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eef1f5] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">Cart</p>
            <h3 className="mt-1 text-xl font-black">장바구니</h3>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg border border-[#dfe3ea] text-[#667085] hover:bg-[#f3f5f8]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-[#98a2b3]" />
              <p className="mt-3 text-sm font-bold text-[#475467]">아직 담긴 교구가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lines.map(({ product, qty }) => (
                <div key={product.id} className="rounded-xl border border-[#dfe3ea] p-3">
                  <p className="font-black">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-[#667085]">{money(product.price)}원</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-lg border border-[#dfe3ea]">
                      <button type="button" onClick={() => update(product.id, qty - 1)} className="h-8 w-8 font-black text-[#667085]">-</button>
                      <span className="w-8 text-center text-sm font-black">{qty}</span>
                      <button type="button" onClick={() => update(product.id, qty + 1)} className="h-8 w-8 font-black text-[#667085]">+</button>
                    </div>
                    <p className="font-black">{money(product.price * qty)}원</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-[#eef1f5] p-5">
          <div className="flex justify-between text-base font-black">
            <span>결제 예정 금액</span>
            <span>{money(subtotal)}원</span>
          </div>
          <button type="button" disabled={lines.length === 0} className="mt-4 h-12 w-full rounded-lg bg-[#172033] text-sm font-black text-white disabled:bg-[#dfe3ea] disabled:text-[#98a2b3]">
            주문으로 이동
          </button>
        </div>
      </aside>
    </div>
  );
}

function Screen({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#667085]">Workspace</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#667085]">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-black">{title}</h3>
        {action && (
          <button type="button" onClick={onAction} className="text-xs font-black text-[#1f5eff]">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wide text-[#667085]">{label}</p>
        <Icon className="h-4 w-4 text-[#1f5eff]" />
      </div>
      <p className="mt-3 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-[#667085]">{note}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3 text-center">
      <p className="text-[11px] font-bold text-[#667085]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#172033]">{value}</p>
    </div>
  );
}

function Quick({ label, caption, icon: Icon, onClick, busy = false }: { label: string; caption: string; icon: React.ElementType; onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="flex w-full items-center gap-3 rounded-lg border border-[#dfe3ea] bg-white p-3 text-left hover:bg-[#fbfcfd] disabled:opacity-60">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-[#1f5eff]">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-semibold text-[#667085]">{caption}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
    </button>
  );
}

function QuickLink({ label, caption, icon: Icon, href }: { label: string; caption: string; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="flex w-full items-center gap-3 rounded-lg border border-[#dfe3ea] bg-white p-3 text-left hover:bg-[#fbfcfd]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#edf3ff] text-[#1f5eff]">
        <Icon className="h-5 w-5" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs font-semibold text-[#667085]">{caption}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#98a2b3]" />
    </Link>
  );
}

function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <ProgramThumb colors={program.colors} large />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black">{program.title}</p>
          <p className="mt-1 text-sm font-semibold text-[#667085]">{program.category} · {program.audience}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${program.status === 'pro' ? 'bg-[#fff4d7] text-[#9a6700]' : 'bg-[#e8f7ee] text-[#16884a]'}`}>
          {program.status.toUpperCase()}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-[#667085]">{program.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {program.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-xs font-bold text-[#667085]">{tag}</span>
        ))}
      </div>
    </article>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <article className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="relative h-36 rounded-lg" style={{ background: `linear-gradient(135deg, ${product.colors[0]}, ${product.colors[1]})` }}>
        <Package className="absolute bottom-4 right-4 h-10 w-10 text-white/85" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-black">{product.label}</span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-[#667085]">{product.brand}</p>
      <h3 className="mt-1 font-black">{product.name}</h3>
      <p className="mt-2 min-h-10 text-sm font-medium leading-5 text-[#667085]">{product.description}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-black">{money(product.price)}원</p>
          {product.compareAt && <p className="text-xs font-bold text-[#98a2b3] line-through">{money(product.compareAt)}원</p>}
        </div>
        <button type="button" onClick={onAdd} className="h-10 rounded-lg bg-[#172033] px-3 text-xs font-black text-white">
          담기
        </button>
      </div>
    </article>
  );
}

function ProgramSkeleton() {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="h-36 animate-pulse rounded-lg bg-[#eef1f5]" />
      <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-[#eef1f5]" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-[#eef1f5]" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[#eef1f5]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[#eef1f5]" />
      </div>
    </div>
  );
}

function ProgramThumb({ colors, large = false }: { colors: [string, string, string, string]; large?: boolean }) {
  return (
    <div className={`grid shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-lg ${large ? 'h-36 w-full' : 'h-16 w-16'}`}>
      {colors.map((color) => (
        <div key={color} style={{ background: color }} />
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#667085]">{label}</span>
      <input value={value} readOnly className="h-11 w-full rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] px-3 text-sm font-bold outline-none" />
    </label>
  );
}
