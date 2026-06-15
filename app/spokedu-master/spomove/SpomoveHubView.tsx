'use client';

import { Lock, MonitorPlay, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { SPOMOVE_AXIS_META } from '@/app/lib/spomove/spomoveAxisMeta';
import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';

import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from './officialSpomovePresets';

type OfficialLibraryTab = 'all' | 'response' | 'attention' | 'executive';
type AccessState = 'checking' | 'allowed' | 'unauthorized' | 'forbidden' | 'error';

const TABS: OfficialLibraryTab[] = ['all', 'response', 'attention', 'executive'];

const TAB_LABELS: Record<OfficialLibraryTab, string> = {
  all: '전체',
  response: SPOMOVE_AXIS_META.response.title,
  attention: SPOMOVE_AXIS_META.attention.title,
  executive: SPOMOVE_AXIS_META.executive.title,
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

type ModalFact = { label: string; value: string };

function getModalFacts(preset: OfficialSpomovePreset): ModalFact[] {
  const { mode } = preset.engine;
  if (mode === 'reactTrain') {
    return [
      { label: '신호 간격', value: '3초' },
      { label: '실행 시간', value: '약 75초' },
      { label: '진행 방식', value: 'FLOW' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ];
  }
  if (mode === 'spatial') {
    return [
      { label: '기억 단위', value: '3색 순서' },
      { label: '라운드', value: '10라운드' },
      { label: 'BGM', value: '자동 재생' },
      { label: '효과음', value: '자동' },
    ];
  }
  return [
    { label: '신호 간격', value: '3초' },
    { label: '반복 횟수', value: '20회' },
    { label: 'BGM', value: '자동 재생' },
    { label: '효과음', value: '자동' },
  ];
}

function tabCount(tab: OfficialLibraryTab) {
  if (tab === 'all') return OFFICIAL_SPOMOVE_LIBRARY.length;
  return OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.axis === tab).length;
}

function PresetCard({
  preset,
  onConfigure,
}: {
  preset: OfficialSpomovePreset;
  onConfigure: (preset: OfficialSpomovePreset) => void;
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

      <button
        type="button"
        onClick={() => onConfigure(preset)}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-slate-950 text-[13px] font-black text-white transition-colors hover:bg-indigo-600"
      >
        <MonitorPlay className="h-[15px] w-[15px]" />
        공식 세팅 확인
      </button>
    </article>
  );
}

function PresetModal({
  preset,
  bgmList,
  onClose,
}: {
  preset: OfficialSpomovePreset;
  bgmList: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const modalFacts = getModalFacts(preset);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const launch = () => {
    if (!preset.isReady) return;
    router.push(officialPresetSessionHref(preset, bgmList[0]));
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spomove-preset-title"
    >
      <button type="button" className="fixed inset-0 cursor-default" onClick={onClose} aria-label="닫기" />
      <section className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="px-6 pb-4 pt-6 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${AXIS_BADGE[preset.axis]}`}>
                  {preset.axisTitle}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {preset.programTitle}
                </span>
              </div>
              <h2 id="spomove-preset-title" className="mt-3 text-[22px] font-black leading-tight text-slate-950">
                {preset.title}
              </h2>
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
              <p className="mt-2 text-[13px] font-medium leading-[1.65] text-slate-600">
                {preset.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="space-y-3.5 border-t border-slate-100 px-6 py-5 sm:px-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              공식 실행 조건
            </h3>
            <div
              className={`mt-2.5 grid grid-cols-2 gap-2 ${
                modalFacts.length >= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
              }`}
            >
              {modalFacts.map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black text-slate-400">{label}</p>
                  <p className="mt-1 text-[13px] font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-slate-50 px-4 py-3.5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              추천 사용 장면
            </h3>
            <p className="mt-1.5 text-[13px] font-medium leading-[1.65] text-slate-800">
              {preset.recommendedUse}
            </p>
          </section>
        </div>

        <footer className="border-t border-slate-100 px-6 pb-6 pt-4 sm:px-8">
          <button
            type="button"
            onClick={launch}
            disabled={!preset.isReady}
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-indigo-600 text-[14px] font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MonitorPlay className="h-5 w-5" />
            큰 화면으로 실행
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function SpomoveHubView() {
  const { list: bgmList } = useSpomoveTrainingBGM();
  const [activeTab, setActiveTab] = useState<OfficialLibraryTab>('all');
  const [selectedPreset, setSelectedPreset] = useState<OfficialSpomovePreset | null>(null);
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

  const filteredPresets =
    activeTab === 'all'
      ? OFFICIAL_SPOMOVE_LIBRARY
      : OFFICIAL_SPOMOVE_LIBRARY.filter((p) => p.axis === activeTab);

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

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPresets.map((preset) => (
            <PresetCard key={preset.id} preset={preset} onConfigure={setSelectedPreset} />
          ))}
        </div>
      </div>

      {selectedPreset ? (
        <PresetModal
          preset={selectedPreset}
          bgmList={bgmList}
          onClose={() => setSelectedPreset(null)}
        />
      ) : null}
    </main>
  );
}
