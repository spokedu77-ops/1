'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { toast } from 'sonner';
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Database,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  MonitorPlay,
  Package,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Timer,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  ChecklistItem,
  Field,
  FlowStep,
  MiniAction,
  Panel,
  ProgramSkeleton,
  Quick,
  QuickLink,
  Screen,
  SmallMetric,
  Stat,
} from './SpokeduSubscriptionPrimitives';
import {
  ADMIN_TASKS,
  CUES,
  LESSONS,
  NAV,
  PLAN_LABEL,
  PRODUCTS,
  PROGRAMS,
  REPORTS,
  SPOMOVE_RUNS,
  STATUS_LABEL,
  type AdminSubscriptionRow,
  type ApiProgramRow,
  type Product,
  type Program,
  type ProContextSummary,
  type ViewId,
} from './spokeduSubscriptionData';

const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
  const tags = [row.main_theme, functionTypes[0], row.group_size]
    .filter((item): item is string => Boolean(item?.trim()))
    .slice(0, 3);

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
        const json = await res.json();
        const rows = Array.isArray(json.programs) ? (json.programs as ApiProgramRow[]) : [];
        const mapped = rows.map(mapApiProgram);
        if (!cancelled) setPrograms(mapped.length > 0 ? mapped : PROGRAMS);
      } catch {
        if (!cancelled) setPrograms(PROGRAMS);
      } finally {
        if (!cancelled) setProgramsLoading(false);
      }
    };
    fetchPrograms();
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
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setContextSummary(json as ProContextSummary);
      } catch {
        if (!cancelled) setContextSummary(null);
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    };
    fetchContext();
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
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setAdminSubscriptions(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (!cancelled) setAdminSubscriptions([]);
      } finally {
        if (!cancelled) setAdminSubscriptionsLoading(false);
      }
    };
    fetchAdminSubscriptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const content =
    view === 'home' ? (
      <HomeView
        onGo={setView}
        onSync={syncCenter}
        syncing={syncing}
        programCount={programs.length}
        programsLoading={programsLoading}
        contextSummary={contextSummary}
        contextLoading={contextLoading}
      />
    ) : view === 'library' ? (
      <LibraryView query={query} programs={programs} loading={programsLoading} onGo={setView} />
    ) : view === 'spomove' ? (
      <SpomoveView onGo={setView} />
    ) : view === 'plan' ? (
      <PlanView onGo={setView} />
    ) : view === 'report' ? (
      <ReportView />
    ) : view === 'shop' ? (
      <ShopView onAdd={addCart} />
    ) : view === 'billing' ? (
      <BillingView
        contextSummary={contextSummary}
        contextLoading={contextLoading}
        adminRows={adminSubscriptions}
        adminRowsLoading={adminSubscriptionsLoading}
        onGo={setView}
      />
    ) : view === 'onboarding' ? (
      <OnboardingView onGo={setView} />
    ) : (
      <OpsView />
    );

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#172033]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[284px] shrink-0 border-r border-[#dfe3ea] bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-[#eef1f5] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1f5eff]">Subscription New</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">SPOKEDU PRO</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">
                기존 Pro의 운영 자산을 유지하면서 구독자용 페이지 흐름을 검증합니다.
              </p>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map(({ id, label, caption, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                    view === id ? 'bg-[#edf3ff] text-[#1f5eff]' : 'text-[#475467] hover:bg-[#f3f5f8]'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{label}</span>
                    <span className="block truncate text-xs font-semibold text-[#98a2b3]">{caption}</span>
                  </span>
                </button>
              ))}
            </nav>
            <div className="border-t border-[#eef1f5] p-4">
              <Link href="/admin/spokedu-pro" className="flex h-11 items-center justify-center rounded-lg bg-[#172033] text-sm font-black text-white">
                기존 Pro로 돌아가기
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/90 backdrop-blur-xl">
            <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#667085]">SPOKEDU 구독 NEW</p>
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
                  {cartCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#1f5eff] px-1.5 text-[10px] font-black text-white">{cartCount}</span>}
                </button>
                <Link href="/admin/spokedu-pro/subscriptions" className="hidden h-10 items-center gap-2 rounded-lg bg-[#172033] px-3 text-sm font-black text-white sm:inline-flex">
                  <CreditCard className="h-4 w-4" />
                  구독 운영
                </Link>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-[#eef1f5] px-4 py-2 lg:hidden">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`h-9 shrink-0 rounded-lg px-3 text-xs font-black ${view === id ? 'bg-[#1f5eff] text-white' : 'bg-[#f3f5f8] text-[#475467]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8">{content}</div>
        </main>
      </div>
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} />
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

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-5">
        <div className="rounded-xl border border-[#dfe3ea] bg-white p-5">
          <p className="text-sm font-black text-[#1f5eff]">오늘의 수업 운영</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight">
            수업 준비, SPOMOVE 실행, 리포트 공유를 한 흐름에서 확인합니다.
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">
            기존 Pro의 관리자 기능을 구독자 화면으로 옮겼을 때 실제 운영자가 어떤 순서로 움직이는지 검증하는 NEW 화면입니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onGo('spomove')} className="h-11 rounded-lg bg-[#1f5eff] px-4 text-sm font-black text-white">
              SPOMOVE 시작
            </button>
            <Link href="/admin/spokedu-pro" className="inline-flex h-11 items-center rounded-lg border border-[#dfe3ea] bg-white px-4 text-sm font-black">
              기존 Pro 열기
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="오늘 수업" value="4" note="2개 준비 필요" icon={CalendarDays} />
          <Stat label="리포트 대기" value="7" note="발송 전 검토" icon={FileText} />
          <Stat label="평균 반응" value="327ms" note="전주 대비 -42ms" icon={Timer} />
          <Stat label="수업안" value={programsLoading ? '...' : String(programCount)} note="Pro API 연결" icon={BookOpen} />
        </div>

        <Panel title="운영 흐름 맵" action="구독자 화면" onAction={() => window.location.assign('/spokedu-pro')}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkspaceFlowCard title="콘텐츠 선택" desc="오늘 수업에 맞는 프로그램을 고릅니다." status={programsLoading ? '불러오는 중' : `${programCount}개 수업안`} icon={BookOpen} onClick={() => onGo('library')} />
            <WorkspaceFlowCard title="수업 운영" desc="주간 계획과 실행을 연결합니다." status="4개 일정" icon={CalendarDays} onClick={() => onGo('plan')} />
            <WorkspaceFlowCard title="가치 공유" desc="리포트와 학부모 공유를 확인합니다." status="7건 대기" icon={Share2} onClick={() => onGo('report')} />
            <WorkspaceFlowCard title="운영 관리" desc="구독과 콘텐츠 상태를 봅니다." status={contextLoading ? '확인 중' : STATUS_LABEL[status]} icon={LayoutDashboard} onClick={() => onGo('ops')} />
          </div>
        </Panel>

        <Panel title="오늘 수업" action="수업 계획" onAction={() => onGo('plan')}>
          <LessonList limit={3} />
        </Panel>

        <Panel title="구독자 페이지 설계">
          <div className="grid gap-3 md:grid-cols-3">
            <JourneyCard title="1. 가입과 온보딩" desc="센터와 교사 정보를 만들고 첫 수업 준비까지 이어집니다." admin="관리자: 리드 확인, 체험 부여" user="구독자: 초기 설정" />
            <JourneyCard title="2. 수업 운영" desc="라이브러리, SPOMOVE, 리포트를 한 흐름으로 실행합니다." admin="관리자: 콘텐츠 품질 관리" user="구독자: 수업 실행" />
            <JourneyCard title="3. 구독 유지" desc="결제 상태와 교구 선택, 리포트 사용성을 확인합니다." admin="관리자: 구독/결제 운영" user="구독자: 플랜 관리" />
          </div>
        </Panel>
      </section>

      <aside className="space-y-5">
        <Panel title="빠른 관리자 작업">
          <div className="space-y-2">
            <Quick label="센터 커리큘럼 동기화" caption="기존 Pro import API 실행" icon={Database} onClick={onSync} busy={syncing} />
            <QuickLink label="구독 운영" caption="구독자와 결제 상태 관리" icon={CreditCard} href="/admin/spokedu-pro/subscriptions" />
            <QuickLink label="리드 관리" caption="문의와 상담 흐름 확인" icon={Inbox} href="/admin/spokedu-pro/leads" />
            <QuickLink label="프로그램 업로드" caption="수업안 CSV 업로드" icon={Upload} href="/admin/spokedu-pro/upload" />
          </div>
        </Panel>
        <Panel title="구독 요약" action="관리" onAction={() => onGo('billing')}>
          <div className="rounded-lg bg-[#172033] p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">SPOKEDU {contextLoading ? '...' : PLAN_LABEL[plan]}</p>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-black">
                {contextLoading ? '확인 중' : STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-4 text-2xl font-black">{contextLoading ? '...' : `${money(contextSummary?.billing.priceKrw ?? 0)}원`}</p>
            <p className="mt-1 text-sm font-medium text-white/60">
              다음 결제일 {formatDate(contextSummary?.billing.currentPeriodEndAt)}
            </p>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function LibraryView({ query, programs, loading, onGo }: { query: string; programs: Program[]; loading: boolean; onGo: (view: ViewId) => void }) {
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return programs;
    return programs.filter((program) =>
      [program.title, program.category, program.audience, program.description, ...program.tags].join(' ').toLowerCase().includes(keyword)
    );
  }, [programs, query]);

  return (
    <Screen title="수업 라이브러리" desc="실제 Pro 수업안 데이터를 바탕으로 계획, SPOMOVE, 교구 확인까지 이어지는 허브입니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-3 md:grid-cols-2">
          {loading ? Array.from({ length: 4 }, (_, index) => <ProgramSkeleton key={index} />) : filtered.map((program) => <ProgramCard key={program.id} program={program} onGo={onGo} />)}
          {!loading && filtered.length === 0 && <div className="rounded-xl border border-[#dfe3ea] bg-white p-5 text-sm font-bold text-[#667085] md:col-span-2">검색 결과가 없습니다.</div>}
        </section>
        <aside className="space-y-5">
          <Panel title="다음 행동">
            <div className="space-y-2">
              <Quick label="이번 주 계획에 추가" caption="선택한 수업안을 주간 운영 보드로 보냅니다." icon={CalendarDays} onClick={() => onGo('plan')} />
              <Quick label="SPOMOVE 연계 확인" caption="도입 또는 집중 전환 세션을 고릅니다." icon={Zap} onClick={() => onGo('spomove')} />
              <Quick label="필요 교구 확인" caption="이번 수업에 맞는 교구를 추천합니다." icon={ShoppingBag} onClick={() => onGo('shop')} />
            </div>
          </Panel>
          <Panel title="관리자 확인">
            <ChecklistItem title="검색 결과가 충분한가" desc="실제 Pro API에서 불러온 수업안이 빠르게 보여야 합니다." done />
            <ChecklistItem title="다음 행동이 분명한가" desc="카드 선택 후 계획, 실행, 교구 중 어디로 갈지 보여줍니다." done />
            <ChecklistItem title="수업 정보 보강이 필요한가" desc="설명, 대상, 교구 정보가 비어 있으면 관리자에서 보강합니다." />
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}

function SpomoveView({ onGo }: { onGo: (view: ViewId) => void }) {
  const [cue, setCue] = useState(CUES[0]);
  const nextCue = () => setCue(CUES[Math.floor(Math.random() * CUES.length)] ?? CUES[0]);

  return (
    <Screen title="SPOMOVE 반응훈련" desc="관리자는 실행 흐름과 콘텐츠 상태를 설계하고, 구독자는 /spokedu-pro에서 수업 중 바로 실행합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Panel title="실행 경로">
            <div className="grid gap-3 md:grid-cols-3">
              <QuickLink label="구독자 Pro에서 실행" caption="수업 중 사용하는 실제 진입점" icon={Zap} href="/spokedu-pro" />
              <QuickLink label="관리자 카탈로그" caption="전체 SPOMOVE 모드 확인" icon={LayoutDashboard} href="/admin/iiwarmup/spomove/training" />
              <QuickLink label="Asset Hub" caption="이미지와 BGM 자산 관리" icon={Package} href="/admin/iiwarmup/assets" />
            </div>
          </Panel>
          <div className="grid gap-3 md:grid-cols-3">
            {SPOMOVE_RUNS.map((run) => (
              <div key={run.title} className="rounded-xl border border-[#dfe3ea] bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f5eff]">{run.mode}</p>
                <h3 className="mt-2 text-lg font-black">{run.title}</h3>
                <p className="mt-2 min-h-[72px] text-sm font-medium leading-6 text-[#667085]">{run.desc}</p>
                <p className="mt-3 rounded-lg bg-[#f3f5f8] p-3 text-sm font-bold text-[#475467]">{run.lesson}</p>
              </div>
            ))}
          </div>
          <Panel title="미니 실행 프로토타입">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="grid min-h-[260px] place-items-center rounded-xl text-white" style={{ background: cue.color }}>
                <div className="text-center">
                  <p className="text-7xl font-black">{cue.symbol}</p>
                  <p className="mt-2 text-lg font-black">{cue.label}</p>
                </div>
              </div>
              <div className="space-y-3">
                <button type="button" onClick={nextCue} className="h-11 w-full rounded-lg bg-[#1f5eff] text-sm font-black text-white">
                  다음 신호
                </button>
                <MiniAction label="수업안" active onClick={() => onGo('library')} />
                <MiniAction label="리포트" active={false} onClick={() => onGo('report')} />
              </div>
            </div>
          </Panel>
        </section>
        <Panel title="구독자 수업 흐름">
          <FlowStep num="1" title="수업안 선택" desc="라이브러리에서 오늘 수업을 고릅니다." />
          <FlowStep num="2" title="SPOMOVE 실행" desc="추천 모드를 연결해 전체 화면으로 엽니다." />
          <FlowStep num="3" title="현장 기록" desc="반응과 참여를 교사가 관찰합니다." />
          <FlowStep num="4" title="리포트 연결" desc="수업 후 성장 리포트의 근거로 씁니다." />
        </Panel>
      </div>
    </Screen>
  );
}

function PlanView({ onGo }: { onGo: (view: ViewId) => void }) {
  return (
    <Screen title="수업 계획" desc="구독자가 주간 수업을 준비하고 관리자 NEW에서 그 흐름이 자연스러운지 확인합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Panel title="주간 보드">
            <LessonList />
          </Panel>
          <Panel title="수업 준비 타임라인">
            <div className="grid gap-3 md:grid-cols-4">
              <FlowStep num="1" title="수업안 선택" desc="목적에 맞는 활동을 고릅니다." />
              <FlowStep num="2" title="교구 확인" desc="필요 교구와 대체 교구를 확인합니다." />
              <FlowStep num="3" title="SPOMOVE 연결" desc="집중 전환 또는 기록 세션을 붙입니다." />
              <FlowStep num="4" title="리포트 예약" desc="수업 후 공유할 성장 포인트를 챙깁니다." />
            </div>
          </Panel>
        </section>
        <Panel title="빠른 수업 추가">
          <Field label="반" value="3학년 A반" />
          <Field label="프로그램" value="8자 서클" />
          <Field label="SPOMOVE" value="스피드 트랙" />
          <button type="button" onClick={() => onGo('library')} className="mt-4 h-11 w-full rounded-lg bg-[#1f5eff] text-sm font-black text-white">
            라이브러리에서 고르기
          </button>
        </Panel>
      </div>
    </Screen>
  );
}

function ReportView() {
  return (
    <Screen title="성장 리포트" desc="수업 후 관찰 기록을 학부모 공유 가치로 바꾸는 흐름을 설계합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <ReportPipelineCard title="1. 수업 기록" desc="SPOMOVE 반응, 참여도, 교사 메모를 모읍니다." icon={Timer} />
            <ReportPipelineCard title="2. 성장 문장" desc="학부모가 이해하기 쉬운 진단 문장으로 바꿉니다." icon={FileText} />
            <ReportPipelineCard title="3. 공유 링크" desc="센터 톤에 맞춘 미리보기와 링크를 생성합니다." icon={Share2} />
          </div>
          <Panel title="리포트 대기 목록">
            <div className="divide-y divide-[#eef1f5]">
              {REPORTS.map((report) => (
                <div key={report.name} className="grid gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[1fr_90px_90px_110px] md:items-center">
                  <div>
                    <p className="font-black">{report.name}</p>
                    <p className="text-sm font-medium text-[#667085]">{report.group}</p>
                  </div>
                  <SmallMetric label="평균" value={`${report.avg}ms`} />
                  <SmallMetric label="개선" value={`${report.delta}ms`} />
                  <span className="rounded-full bg-[#edf3ff] px-3 py-1 text-center text-xs font-black text-[#1f5eff]">{report.state}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>
        <Panel title="미리보기">
          <div className="rounded-xl bg-[#172033] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">Parent Share</p>
            <h3 className="mt-4 text-2xl font-black">김서윤 성장 리포트</h3>
            <p className="mt-3 text-sm font-medium leading-6 text-white/70">
              반응속도와 참여감이 모두 개선되었습니다. 다음 주에는 방향 전환 과제를 조금 더 확장합니다.
            </p>
            <button type="button" className="mt-5 h-11 w-full rounded-lg bg-white text-sm font-black text-[#172033]">
              공유 링크 만들기
            </button>
          </div>
        </Panel>
      </div>
    </Screen>
  );
}

function ShopView({ onAdd }: { onAdd: (id: string) => void }) {
  return (
    <Screen title="교구 샵" desc="이번 주 수업 계획과 연결된 교구를 추천하고, 구독자 선택과 주문 흐름을 함께 보여줍니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-3 md:grid-cols-2">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={() => onAdd(product.id)} />
          ))}
        </section>
        <Panel title="수업별 교구 추천">
          <EquipmentLessonCard lesson="8자 서클" items={['컬러 마커콘', '미니 허들']} benefit="동선과 방향 전환을 빠르게 구성" />
          <EquipmentLessonCard lesson="포커스 서클" items={['반응훈련 볼', '삼각대']} benefit="반응 기록과 피드백 촬영" />
          <EquipmentLessonCard lesson="밸런스 로드" items={['미니 허들', '마커콘']} benefit="균형 경로와 시야 조절" />
        </Panel>
      </div>
    </Screen>
  );
}

function BillingView({
  contextSummary,
  contextLoading,
  adminRows,
  adminRowsLoading,
  onGo,
}: {
  contextSummary: ProContextSummary | null;
  contextLoading: boolean;
  adminRows: AdminSubscriptionRow[];
  adminRowsLoading: boolean;
  onGo: (view: ViewId) => void;
}) {
  const currentPlan = contextSummary?.entitlement.plan ?? 'free';
  const currentStatus = contextSummary?.entitlement.status ?? 'active';
  const adminCounts = adminRows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    { trialing: 0, active: 0, past_due: 0, canceled: 0, expired: 0 }
  );

  return (
    <Screen title="구독/결제" desc="한 화면에서 결제 상태, 플랜 차이, 기존 운영 링크를 정리해 봅니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="현재 플랜" value={contextLoading ? '...' : PLAN_LABEL[currentPlan]} note={STATUS_LABEL[currentStatus]} icon={CreditCard} />
            <Stat label="다음 결제일" value={contextLoading ? '...' : formatDate(contextSummary?.billing.currentPeriodEndAt)} note="현재 센터 기준" icon={CalendarDays} />
            <Stat label="학생 수" value={contextLoading ? '...' : String(contextSummary?.usage.studentCount ?? 0)} note="컨텍스트 API" icon={BookOpen} />
            <Stat label="AI 리포트" value={contextLoading ? '...' : String(contextSummary?.usage.aiReportThisMonth ?? 0)} note="이번 달 사용량" icon={FileText} />
          </div>
          <Panel title="플랜 비교">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['Free', '0원', '기본 체험', '기본 수업안 8개'],
                ['PRO', '29,000원', '교사 1인 구독', '전체 수업안과 리포트'],
                ['Teams', '문의', '기관/센터용', '교사 계정과 센터 통계'],
              ].map(([name, price, subtitle, desc]) => (
                <div key={name} className="rounded-xl border border-[#dfe3ea] bg-white p-4">
                  <p className="text-sm font-black text-[#1f5eff]">{name}</p>
                  <p className="mt-2 text-2xl font-black">{price}</p>
                  <p className="mt-2 text-sm font-bold text-[#475467]">{subtitle}</p>
                  <p className="mt-1 text-sm font-medium text-[#667085]">{desc}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
        <aside className="space-y-5">
          <Panel title="현재 센터">
            <SmallMetric label="상태" value={contextLoading ? '...' : STATUS_LABEL[currentStatus]} />
            <SmallMetric label="다음 청구일" value={contextLoading ? '...' : formatDate(contextSummary?.billing.currentPeriodEndAt)} />
            <QuickLink label="기존 구독 운영" caption="상세 관리 페이지로 이동" icon={CreditCard} href="/admin/spokedu-pro/subscriptions" />
            <Quick label="교구 혜택 보기" caption="PRO 할인 적용" icon={ShoppingBag} onClick={() => onGo('shop')} />
          </Panel>
          <Panel title="전체 구독자">
            <div className="grid grid-cols-2 gap-2">
              <SmallMetric label="체험" value={adminRowsLoading ? '...' : String(adminCounts.trialing)} />
              <SmallMetric label="활성" value={adminRowsLoading ? '...' : String(adminCounts.active)} />
              <SmallMetric label="결제 지연" value={adminRowsLoading ? '...' : String(adminCounts.past_due)} />
              <SmallMetric label="해지/만료" value={adminRowsLoading ? '...' : String(adminCounts.canceled + adminCounts.expired)} />
            </div>
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}

function OnboardingView({ onGo }: { onGo: (view: ViewId) => void }) {
  return (
    <Screen title="온보딩" desc="구독자가 처음 들어왔을 때 오늘 수업까지 도달하는 최소 경로를 설계합니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-5">
          <Panel title="첫 진입 흐름">
            <div className="grid gap-3 md:grid-cols-4">
              <FlowStep num="1" title="센터 만들기" desc="기관명, 교사 역할, 기본 수업 대상을 정합니다." />
              <FlowStep num="2" title="첫 수업안 선택" desc="대상 연령과 공간에 맞는 추천 수업안을 보여줍니다." />
              <FlowStep num="3" title="SPOMOVE 테스트" desc="프로젝터나 태블릿 환경에서 반응훈련이 잘 보이는지 확인합니다." />
              <FlowStep num="4" title="샘플 리포트 확인" desc="학부모에게 어떤 가치가 전달되는지 보여줍니다." />
            </div>
          </Panel>
        </section>
        <Panel title="설정 카드">
          <Field label="기관명" value="연세 체육교육 연구소" />
          <Field label="활성 플랜" value="PRO Trial" />
          <Field label="오늘의 목표" value="첫 수업 실행까지 5분" />
          <button type="button" onClick={() => onGo('library')} className="mt-4 h-11 w-full rounded-lg bg-[#1f5eff] text-sm font-black text-white">
            첫 수업 고르기
          </button>
        </Panel>
      </div>
    </Screen>
  );
}

function OpsView() {
  return (
    <Screen title="관리자 도구" desc="기존 Pro의 실제 관리 기능을 새 워크스페이스에서 찾기 쉽게 묶었습니다.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-3 md:grid-cols-2">
          {ADMIN_TASKS.map((task) => (
            <AdminTaskCard key={task.title} task={task} />
          ))}
        </section>
        <aside className="space-y-5">
          <Panel title="운영 체크리스트">
            <ChecklistItem title="체험 만료 점검" desc="trialing 센터의 만료일과 전환 상태를 확인합니다." />
            <ChecklistItem title="수업안 보조정보 보강" desc="대상, 설명, 교구 정보를 채웁니다." done />
            <ChecklistItem title="구독 화면 비교" desc="기존 Pro와 NEW의 정보 구조 차이를 검증합니다." done />
          </Panel>
          <Panel title="프로젝터 모드">
            <div className="grid min-h-[180px] place-items-center rounded-xl bg-[#172033] text-white">
              <MonitorPlay className="h-12 w-12" />
            </div>
          </Panel>
        </aside>
      </div>
    </Screen>
  );
}

function LessonList({ limit }: { limit?: number }) {
  return (
    <div className="divide-y divide-[#eef1f5]">
      {LESSONS.slice(0, limit).map((lesson) => (
        <div key={`${lesson.date}-${lesson.title}`} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
          <div className="h-10 w-1.5 rounded-full" style={{ background: lesson.color }} />
          <div className="min-w-0 flex-1">
            <p className="font-black">{lesson.title}</p>
            <p className="text-sm font-medium text-[#667085]">
              {lesson.date} / {lesson.time} / {lesson.group}
            </p>
          </div>
          <span className="rounded-full bg-[#f3f5f8] px-3 py-1 text-xs font-black text-[#475467]">{lesson.status}</span>
        </div>
      ))}
    </div>
  );
}

function WorkspaceFlowCard({ title, desc, status, icon: Icon, onClick }: { title: string; desc: string; status: string; icon: ElementType; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-[#dfe3ea] bg-[#fbfcfd] p-4 text-left hover:border-[#1f5eff]">
      <Icon className="h-5 w-5 text-[#1f5eff]" />
      <h4 className="mt-3 font-black">{title}</h4>
      <p className="mt-1 min-h-[44px] text-sm font-medium leading-5 text-[#667085]">{desc}</p>
      <p className="mt-3 text-xs font-black text-[#1f5eff]">{status}</p>
    </button>
  );
}

function JourneyCard({ title, desc, admin, user }: { title: string; desc: string; admin: string; user: string }) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-[#fbfcfd] p-4">
      <h4 className="font-black">{title}</h4>
      <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">{desc}</p>
      <p className="mt-3 rounded-lg bg-white p-2 text-xs font-black text-[#475467]">{admin}</p>
      <p className="mt-2 rounded-lg bg-[#edf3ff] p-2 text-xs font-black text-[#1f5eff]">{user}</p>
    </div>
  );
}

function ProgramCard({ program, onGo }: { program: Program; onGo: (view: ViewId) => void }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white">
      <div className="h-28" style={{ background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1f5eff]">{program.category}</p>
            <h3 className="mt-1 text-xl font-black">{program.title}</h3>
          </div>
          <span className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-xs font-black text-[#475467]">{program.status.toUpperCase()}</span>
        </div>
        <p className="mt-2 min-h-[48px] text-sm font-medium leading-6 text-[#667085]">{program.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {program.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-xs font-bold text-[#475467]">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onGo('plan')} className="h-10 rounded-lg bg-[#edf3ff] text-xs font-black text-[#1f5eff]">
            계획
          </button>
          <button type="button" onClick={() => onGo('spomove')} className="h-10 rounded-lg bg-[#172033] text-xs font-black text-white">
            실행
          </button>
          <button type="button" onClick={() => onGo('shop')} className="h-10 rounded-lg bg-[#f3f5f8] text-xs font-black text-[#475467]">
            교구
          </button>
        </div>
      </div>
    </article>
  );
}

function ReportPipelineCard({ title, desc, icon: Icon }: { title: string; desc: string; icon: ElementType }) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <Icon className="h-8 w-8 text-[#1f5eff]" />
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">{desc}</p>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  return (
    <article className="rounded-xl border border-[#dfe3ea] bg-white p-4">
      <div className="relative min-h-[140px] overflow-hidden rounded-xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${product.colors[0]}, ${product.colors[1]})` }}>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-white/75">{product.label}</p>
        <h3 className="mt-2 text-xl font-black">{product.name}</h3>
        <p className="mt-1 text-sm font-bold text-white/75">{product.brand}</p>
        <Package className="absolute bottom-4 right-4 h-10 w-10 text-white/85" />
      </div>
      <p className="mt-3 min-h-[48px] text-sm font-medium leading-6 text-[#667085]">{product.description}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-black">{money(product.price)}원</p>
          {product.compareAt && <p className="text-sm font-bold text-[#98a2b3] line-through">{money(product.compareAt)}원</p>}
        </div>
        <button type="button" onClick={onAdd} className="h-10 rounded-lg bg-[#1f5eff] px-3 text-sm font-black text-white">
          담기
        </button>
      </div>
    </article>
  );
}

function EquipmentLessonCard({ lesson, items, benefit }: { lesson: string; items: string[]; benefit: string }) {
  return (
    <div className="rounded-xl border border-[#dfe3ea] bg-[#fbfcfd] p-3">
      <p className="font-black">{lesson}</p>
      <p className="mt-1 text-sm font-medium text-[#667085]">{benefit}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#475467]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdminTaskCard({ task }: { task: { title: string; desc: string; href: string; icon: ElementType; status: string; tone: 'blue' | 'green' | 'amber' | 'slate' } }) {
  const toneClass = {
    blue: 'bg-[#edf3ff] text-[#1f5eff]',
    green: 'bg-[#ecfdf3] text-[#039855]',
    amber: 'bg-[#fffaeb] text-[#dc6803]',
    slate: 'bg-[#f3f5f8] text-[#475467]',
  }[task.tone];
  const Icon = task.icon;
  return (
    <Link href={task.href} className="rounded-xl border border-[#dfe3ea] bg-white p-4 hover:border-[#1f5eff]">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-[#f3f5f8] px-2.5 py-1 text-xs font-black text-[#475467]">{task.status}</span>
      </div>
      <h3 className="mt-4 text-lg font-black">{task.title}</h3>
      <p className="mt-2 text-sm font-medium leading-6 text-[#667085]">{task.desc}</p>
    </Link>
  );
}

function CartDrawer({ cart, open, onClose }: { cart: Record<string, number>; open: boolean; onClose: () => void }) {
  const items = Object.entries(cart)
    .map(([id, qty]) => ({ product: PRODUCTS.find((item) => item.id === id), qty }))
    .filter((item): item is { product: Product; qty: number } => Boolean(item.product));
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <button type="button" aria-label="장바구니 닫기" onClick={onClose} className={`absolute inset-0 bg-[#172033]/35 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col bg-white shadow-2xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-[#eef1f5] p-4">
          <h2 className="text-lg font-black">교구 장바구니</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg bg-[#f3f5f8]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="rounded-lg bg-[#f3f5f8] p-4 text-sm font-bold text-[#667085]">아직 담긴 교구가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="rounded-xl border border-[#dfe3ea] p-3">
                  <p className="font-black">{product.name}</p>
                  <p className="mt-1 text-sm font-medium text-[#667085]">
                    {money(product.price)}원 / {qty}개
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-[#eef1f5] p-4">
          <div className="mb-3 flex items-center justify-between text-sm font-black">
            <span>결제 예정 금액</span>
            <span>{money(total)}원</span>
          </div>
          <button type="button" className="h-11 w-full rounded-lg bg-[#172033] text-sm font-black text-white">
            주문 흐름 확인
          </button>
        </div>
      </aside>
    </div>
  );
}
