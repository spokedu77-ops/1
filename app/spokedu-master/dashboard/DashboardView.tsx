'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Clock3, Lock, Play, Smartphone, UsersRound, Zap } from 'lucide-react';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { DRILLS, PROGRAMS } from '../lib/data';
import { getTrialDaysLeft } from '../lib/subscription';
import { useIsPro, useMasterStore, useOperationalStatus, useProfile, useStats, useUnreadCount } from '../store';

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10">
      <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
      {href ? <Link href={href} className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>전체보기</Link> : null}
    </div>
  );
}

function KpiCard({ value, label, delta }: { value: string; label: string; delta: string }) {
  return (
    <div className="rounded-[12px] p-[13px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[22px] font-bold leading-none" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      <p className="mt-1 text-[9px] font-semibold" style={{ color: 'var(--spm-grn)' }}>{delta}</p>
    </div>
  );
}

function ThumbGrid({ colors, size = 66 }: { colors: [string, string, string, string]; size?: number }) {
  return (
    <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[10px]" style={{ width: size, height: size }} aria-hidden>
      {colors.map((color) => <span key={color} style={{ background: color }} />)}
    </div>
  );
}

function ProBanner() {
  return (
    <Link href="/spokedu-master/profile" className="mx-[22px] mb-6 flex items-center gap-2.5 rounded-[10px] px-[14px] py-[11px] sm:mx-8 lg:mx-10" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.18)' }}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px]" style={{ background: 'rgba(245,158,11,0.15)' }}><Lock size={14} color="var(--spm-amb)" /></span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[12px] font-bold" style={{ color: 'var(--spm-amb)' }}>PRO 업그레이드</strong>
        <span className="mt-0.5 block text-[10px]" style={{ color: 'rgba(245,158,11,0.65)' }}>전체 프로그램, SPOMOVE 실행, 성장 리포트 기능을 해제합니다.</span>
      </span>
      <ChevronRight size={16} color="rgba(245,158,11,0.55)" />
    </Link>
  );
}

function ServiceIdentityCard() {
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <div className="grid gap-5 overflow-hidden rounded-[18px] p-5 md:grid-cols-[1.35fr_0.65fr] md:p-7" style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.28), rgba(29,158,117,0.14), var(--spm-s2))', border: '1px solid rgba(99,102,241,0.28)' }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: '#93c5fd' }}>SPOKEDU MASTER</p>
          <h2 className="mt-3 max-w-[620px] text-[26px] font-black leading-[1.16] md:text-[34px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>
            놀이체육과 SPOMOVE를 구독하는 프로그램 라이브러리
          </h2>
          <p className="mt-3 max-w-[640px] text-[13px] font-medium leading-6 md:text-[15px]" style={{ color: 'var(--spm-t2)' }}>
            수업안은 넷플릭스처럼 고르고, SPOMOVE는 웹에서 바로 실행하고, 수업 기록은 학생 성장 이력으로 쌓입니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <Link href="/spokedu-master/library" className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black text-white" style={{ background: 'var(--spm-acc)' }}><Play size={15} fill="#fff" />프로그램 탐색</Link>
          <Link href="/spokedu-master/spomove" className="flex h-12 items-center justify-center gap-2 rounded-[12px] text-[13px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}><Smartphone size={15} />웹 실행</Link>
        </div>
      </div>
    </section>
  );
}

function TodayClassCard() {
  const lessons = useMasterStore((state) => state.lessons);
  const todayLesson = lessons[0];
  const program = PROGRAMS.find((item) => todayLesson?.title.includes(item.title.split(':')[0])) ?? PROGRAMS[0]!;
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <div className="relative overflow-hidden rounded-[14px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899]" />
        <div className="grid gap-4 p-[18px] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <span className="mb-3 inline-flex items-center gap-[5px] rounded-[6px] px-[9px] py-[3px] text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--spm-grn)' }}>
              <span className="h-[5px] w-[5px] animate-pulse rounded-full" style={{ background: 'var(--spm-grn)' }} />
              {todayLesson?.classId ?? '초등 A반'} 진행 예정
            </span>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="mb-1 text-[20px] font-bold leading-[1.25]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{todayLesson?.title ?? program.title}</h3>
                <p className="text-[11px] font-normal" style={{ color: 'var(--spm-t3)' }}>{todayLesson ? `${todayLesson.period}교시 / ${todayLesson.duration}분 / ${program.space}` : '3교시 / 15분 / 좁은 공간'}</p>
              </div>
              <ThumbGrid colors={program.colors} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_48px] gap-2 md:min-w-[260px]">
            <Link href="/spokedu-master/class-record" className="flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-[13px] text-[14px] font-semibold text-white active:scale-[0.98]" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px var(--spm-acc-glow)', fontFamily: 'var(--spm-font-display)' }}><Play size={14} fill="white" />수업 기록하기</Link>
            <Link href="/spokedu-master/library" className="grid place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }} aria-label="수업 상세 보기"><ChevronRight size={17} color="var(--spm-t2)" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgramRecommendationCard() {
  const classRecords = useMasterStore((state) => state.classRecords);
  const usedProgramIds = new Set(classRecords.map((record) => record.programId));
  const recommended = PROGRAMS.find((program) => !usedProgramIds.has(program.id)) ?? PROGRAMS[0]!;
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <Link href={`/spokedu-master/library/${recommended.id}`} className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}><Clock3 size={19} color="var(--spm-acc)" /></span>
        <span className="min-w-0 flex-1">
          <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>다음 추천: {recommended.title}</strong>
          <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>아직 이 반에서 사용하지 않은 프로그램입니다.</span>
        </span>
        <ChevronRight size={18} color="var(--spm-t3)" />
      </Link>
    </section>
  );
}

function DrillTile({ drill, index }: { drill: (typeof DRILLS)[number]; index: number }) {
  const gradients = ['linear-gradient(135deg,#312e81,#4f46e5)', 'linear-gradient(135deg,#064e3b,#059669)', 'linear-gradient(135deg,#1e1b4b,#7c3aed)', 'linear-gradient(135deg,#713f12,#be123c)'];
  return (
    <Link href={`/spokedu-master/spomove/session?drill=${drill.id}`} className="relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[12px] p-[16px_14px] active:scale-95" style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between"><span className="grid h-[30px] w-[30px] place-items-center rounded-[8px]" style={{ background: 'rgba(255,255,255,0.1)' }}><Zap size={15} color="#fff" /></span><span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}><Play size={10} fill="#fff" color="#fff" /></span></div>
      <div><p className="mb-[3px] text-[9px] font-semibold uppercase tracking-[0.06em] text-white/45">{drill.category}</p><p className="text-[14px] font-semibold leading-[1.25] text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</p></div>
      {drill.isPro ? <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-bold text-white/70">PRO</span> : null}
    </Link>
  );
}

function DirectorSnapshot() {
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <div className="rounded-[18px] p-5" style={{ background: 'linear-gradient(135deg, rgba(29,158,117,0.16), var(--spm-s2))', border: '1px solid rgba(16,185,129,0.24)' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-grn)' }}>director dashboard</p>
        <h2 className="mt-2 text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>센터 운영 신호를 한 화면에서 봅니다</h2>
        <p className="mt-2 text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>강사 기록률, 이탈 위험 학생, 센터 플랜 사용량을 기준으로 운영 리스크를 조기에 확인합니다.</p>
        <Link href="/spokedu-master/director" className="mt-5 flex h-12 items-center justify-center rounded-[12px] text-[14px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>센터 대시보드 열기</Link>
      </div>
    </section>
  );
}

function ServiceHealthStrip() {
  const profile = useProfile();
  const operational = useOperationalStatus();
  const trialDaysLeft = getTrialDaysLeft(profile);
  const planLabel = profile?.plan === 'team' ? '센터 플랜' : profile?.plan === 'pro' ? '개인 PRO' : `무료 체험 ${trialDaysLeft}일`;

  return (
    <section className="mb-7 grid gap-2 px-[22px] sm:grid-cols-3 sm:px-8 lg:px-10">
      <Link href="/spokedu-master/profile" className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>구독 상태</p>
        <p className="mt-1 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{planLabel}</p>
      </Link>
      <Link href="/spokedu-master/profile" className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>동기화</p>
        <p className="mt-1 text-[14px] font-black" style={{ color: operational.online ? 'var(--spm-grn)' : 'var(--spm-amb)' }}>{operational.online ? '온라인 정상' : '오프라인 저장'}</p>
      </Link>
      <Link href="/spokedu-master/profile" className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>재시도</p>
        <p className="mt-1 text-[14px] font-black" style={{ color: operational.retryQueue.length ? 'var(--spm-amb)' : 'var(--spm-t)' }}>{operational.retryQueue.length}건 대기</p>
      </Link>
    </section>
  );
}

export default function DashboardView() {
  const profile = useProfile();
  const isPro = useIsPro();
  const stats = useStats();
  const unreadCount = useUnreadCount();
  const lessons = useMasterStore((state) => state.lessons);
  const activeClasses = new Set(lessons.map((lesson) => lesson.classId)).size;

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="flex items-center justify-between px-[22px] pb-[18px] pt-[22px] sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-[12px] italic" style={{ color: 'var(--spm-t3)' }}>좋은 아침이에요</p>
          <h1 className="text-[22px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{profile?.name ?? '선생님'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }} aria-label="알림">
            <Bell size={18} color="var(--spm-t2)" />
            {unreadCount > 0 ? <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full" style={{ background: 'var(--spm-red)', border: '1.5px solid var(--spm-bg)' }} /> : null}
          </button>
          <Link href="/spokedu-master/profile" className="grid h-10 w-10 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}>{(profile?.name ?? '선생님').slice(0, 1)}</Link>
        </div>
      </header>

      {!isPro ? <ProBanner /> : null}
      <ServiceIdentityCard />
      <ServiceHealthStrip />
      {profile?.role === 'director' ? <DirectorSnapshot /> : null}

      <section className="mb-7 grid grid-cols-2 gap-2 px-[22px] sm:grid-cols-4 sm:px-8 lg:px-10">
        <KpiCard value="153" label="프로그램" delta="+8 신규" />
        <KpiCard value={String(activeClasses || 3)} label={profile?.role === 'director' ? '운영 반' : '진행 반'} delta="오늘 2개" />
        <KpiCard value={String(Math.max(stats.thisWeekSessions, 8))} label="주간 추천" delta="맞춤 갱신" />
        <KpiCard value={String(Math.max(stats.totalCues, 41))} label="SPOMOVE" delta={stats.avgRT ? `${stats.avgRT}ms 평균` : '측정 준비'} />
      </section>

      <SectionHeader title="오늘 수업" href="/spokedu-master/plan" />
      <TodayClassCard />
      <ProgramRecommendationCard />

      <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Link href="/spokedu-master/students" className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(16,185,129,0.13)' }}><UsersRound size={19} color="var(--spm-grn)" /></span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>학생 성장 이력</strong>
            <span className="mt-1 block text-[11px]" style={{ color: 'var(--spm-t3)' }}>배지, 위험 신호, 누적 수업 기록을 확인합니다.</span>
          </span>
          <ChevronRight size={18} color="var(--spm-t3)" />
        </Link>
      </section>

      <section className="mb-7">
        <SectionHeader title="SPOMOVE 웹 실행" href="/spokedu-master/spomove" />
        <div className="grid grid-cols-2 gap-2 px-[22px] sm:grid-cols-4 sm:px-8 lg:px-10">{DRILLS.slice(0, 4).map((drill, index) => <DrillTile key={drill.id} drill={drill} index={index} />)}</div>
      </section>

      <section className="px-[22px] sm:px-8 lg:hidden lg:px-10">
        <PwaInstallCard compact />
      </section>
    </div>
  );
}
