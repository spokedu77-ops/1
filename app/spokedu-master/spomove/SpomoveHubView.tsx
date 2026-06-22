'use client';

import { Lock, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SPOMOVE_AXIS_META } from '@/app/lib/spomove/spomoveAxisMeta';

import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
  type OfficialSpomoveProgramGroup,
} from './officialSpomovePresets';

type OfficialLibraryTab = 'all' | 'response' | 'attention' | 'executive';
type ProgramGroupTab = 'all' | OfficialSpomoveProgramGroup;
type AccessState = 'checking' | 'allowed' | 'unauthorized' | 'forbidden' | 'error';

const TABS: OfficialLibraryTab[] = ['all', 'response', 'attention', 'executive'];

const TAB_LABELS: Record<OfficialLibraryTab, string> = {
  all: '전체',
  response: SPOMOVE_AXIS_META.response.title,
  attention: SPOMOVE_AXIS_META.attention.title,
  executive: SPOMOVE_AXIS_META.executive.title,
};

const PROGRAM_GROUP_TABS: ProgramGroupTab[] = [
  'all',
  'reaction-cognition',
  'visual-reaction',
  'simon',
  'flanker',
  'stroop',
  'sequential-memory',
  'dive',
  'bonus',
];

const PROGRAM_GROUP_LABELS: Record<ProgramGroupTab, string> = {
  all: '전체',
  'reaction-cognition': '반응 인지',
  'visual-reaction': '시지각 반응',
  simon: '사이먼 효과',
  flanker: '플랭커',
  stroop: '스트룹 과제',
  'sequential-memory': '순차 기억',
  dive: '다이브',
  bonus: '보너스',
};

const AXIS_BADGE: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-orange-50 text-orange-700',
  attention: 'bg-blue-50 text-blue-700',
  executive: 'bg-violet-50 text-violet-700',
};

const AXIS_TEXT: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'text-orange-600',
  attention: 'text-blue-600',
  executive: 'text-violet-600',
};

function tabCount(tab: OfficialLibraryTab) {
  if (tab === 'all') return OFFICIAL_SPOMOVE_LIBRARY.length;
  return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.axis === tab).length;
}

function programGroupCount(tab: ProgramGroupTab) {
  if (tab === 'all') return OFFICIAL_SPOMOVE_LIBRARY.length;
  return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.programGroup === tab).length;
}

function PresetCard({
  preset,
  href,
}: {
  preset: OfficialSpomovePreset;
  href: string;
}) {
  return (
    <article className="flex flex-col rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${AXIS_BADGE[preset.axis]}`}>
          {preset.axisTitle}
        </span>
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {preset.programTitle}
        </span>
      </div>

      <div className="mt-3.5">
        <h2 className="text-[17px] font-black leading-snug text-slate-950">{preset.title}</h2>
        {preset.en ? (
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {preset.en}
          </p>
        ) : null}
        {preset.salesCopy ? (
          <p className={`mt-2 text-[12px] font-bold leading-snug ${AXIS_TEXT[preset.axis]}`}>
            {preset.salesCopy}
          </p>
        ) : null}
      </div>

      <p className="mt-2.5 flex-grow text-[13px] font-medium leading-[1.7] text-slate-600">
        {preset.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {preset.settingChips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700"
          >
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">사용 장면</p>
        <p className="mt-1 text-[12px] font-semibold leading-[1.6] text-slate-700">
          {preset.recommendedUse}
        </p>
      </div>

      <Link
        href={href}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-950 text-[13px] font-black text-white transition-colors hover:bg-indigo-600"
      >
        <MonitorPlay className="h-[15px] w-[15px]" />
        큰 화면으로 실행
      </Link>
    </article>
  );
}

export default function SpomoveHubView() {
  const [activeTab, setActiveTab] = useState<OfficialLibraryTab>('all');
  const [activeProgramGroup, setActiveProgramGroup] = useState<ProgramGroupTab>('all');
  const [accessState, setAccessState] = useState<AccessState>('checking');

  useEffect(() => {
    let alive = true;
    fetch('/api/spokedu-master/access', { cache: 'no-store' })
      .then((response) => {
        if (!alive) return;
        if (response.ok) setAccessState('allowed');
        else if (response.status === 401) setAccessState('unauthorized');
        else if (response.status === 403) setAccessState('forbidden');
        else setAccessState('error');
      })
      .catch(() => {
        if (alive) setAccessState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (accessState === 'checking') {
    return (
      <main className="flex h-full items-center justify-center bg-[#f5f7fb]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </main>
    );
  }

  if (accessState !== 'allowed') {
    const message =
      accessState === 'unauthorized'
        ? '로그인 후 SPOMOVE를 이용할 수 있습니다.'
        : accessState === 'forbidden'
          ? '이용 기간이 종료되어 SPOMOVE를 실행할 수 없습니다.'
          : 'SPOMOVE 이용 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="flex h-full items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <h1 className="mt-4 text-xl font-black text-slate-950">SPOMOVE를 실행할 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link
            href="/spokedu-master/subscription"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white"
          >
            이용권 확인
          </Link>
        </section>
      </main>
    );
  }

  const filteredPresets = OFFICIAL_SPOMOVE_LIBRARY.filter((p) => {
    const axisMatch = activeTab === 'all' || p.axis === activeTab;
    const groupMatch = activeProgramGroup === 'all' || p.programGroup === activeProgramGroup;
    return axisMatch && groupMatch;
  });

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        <header className="overflow-hidden rounded-[28px] bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-black text-white/80">
            <MonitorPlay className="h-3.5 w-3.5" />
            구독자 공식 라이브러리
          </span>
          <h1 className="mt-5 text-[34px] font-black leading-tight sm:text-[46px]">
            SPOMOVE 공식 프로그램
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] font-medium leading-7 text-white/58">
            바로 실행할 수 있는 구독자용 SPOMOVE 공식 세팅 라이브러리입니다. 단순·선택·복합 반응 축을 기준으로
            아이들이 보고, 고르고, 기억하고, 움직이는 경험을 제공합니다.
          </p>
          <p className="mt-3 text-[12px] font-semibold text-white/30">
            각 프로그램은 사전 설정된 공식 조건으로 실행됩니다.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            const count = tabCount(tab);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-black transition-all ${
                  active
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {TAB_LABELS[tab]}
                <span
                  className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PROGRAM_GROUP_TABS.map((tab) => {
            const active = activeProgramGroup === tab;
            const count = programGroupCount(tab);
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveProgramGroup(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-700'
                }`}
              >
                {PROGRAM_GROUP_LABELS[tab]}
                <span
                  className={`inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              href={officialPresetSessionHref(preset)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
