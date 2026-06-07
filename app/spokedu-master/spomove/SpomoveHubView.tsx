'use client';

import { Clock3, Lock, MonitorPlay, Music2, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';

import { useMasterStore } from '../store';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from './officialSpomovePresets';

const AXIS_BADGE: Record<OfficialSpomovePreset['axis'], string> = {
  response: 'bg-orange-50 text-orange-700',
  attention: 'bg-blue-50 text-blue-700',
  executive: 'bg-violet-50 text-violet-700',
};

function PresetCard({
  preset,
  onConfigure,
}: {
  preset: OfficialSpomovePreset;
  onConfigure: (preset: OfficialSpomovePreset) => void;
}) {
  return (
    <article className="flex min-h-[320px] flex-col justify-between rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${AXIS_BADGE[preset.axis]}`}>
            {preset.axisTitle} · {preset.programTitle}
          </span>
          {!preset.isReady ? (
            <span className="inline-flex shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700">
              {preset.readyLabel ?? '이식 필요'}
            </span>
          ) : null}
        </div>
        <h2 className="mt-4 text-xl font-black leading-tight text-slate-950">{preset.title}</h2>
        {preset.en ? (
          <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">{preset.en}</p>
        ) : null}
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{preset.description}</p>
      </div>

      <div className="mt-5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-black text-slate-400">신호 간격</p>
            <p className="mt-0.5 text-sm font-black text-slate-900">3초 고정</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-black text-slate-400">반복 횟수</p>
            <p className="mt-0.5 text-sm font-black text-slate-900">20회 고정</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-black text-slate-400">BGM</p>
            <p className="mt-0.5 text-sm font-black text-slate-900">자동</p>
          </div>
        </div>
        <div className="mt-2 rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-black text-slate-400">사용 장면</p>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-800">{preset.recommendedUse}</p>
        </div>
        <button
          type="button"
          onClick={() => onConfigure(preset)}
          disabled={!preset.isReady}
          className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${
            preset.isReady
              ? 'bg-slate-950 text-white hover:bg-indigo-600'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
          }`}
        >
          {preset.isReady ? (
            <>
              <Settings2 className="h-4 w-4" />
              설정 확인
            </>
          ) : (
            (preset.readyLabel ?? '이식 필요')
          )}
        </button>
      </div>
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const launch = () => {
    if (!preset.isReady) return;
    router.push(officialPresetSessionHref(preset, bgmList[0]));
  };

  const axisBadgeClass = AXIS_BADGE[preset.axis];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="spomove-preset-title">
      <button type="button" className="fixed inset-0 cursor-default" onClick={onClose} aria-label="설정 닫기" />
      <section className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${axisBadgeClass}`}>
                {preset.axisTitle} · {preset.programTitle}
              </span>
              <h2 id="spomove-preset-title" className="mt-3 text-2xl font-black text-slate-950">
                {preset.title}
              </h2>
              {preset.en ? (
                <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">{preset.en}</p>
              ) : null}
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{preset.description}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label="닫기">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">고정 실행 조건</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['신호 간격', '3초'],
                ['반복 횟수', '20회'],
                ['BGM', 'BGM 자동'],
                ['효과음', '자동'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-black text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">추천 사용 장면</h3>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{preset.recommendedUse}</p>
          </section>

          {!preset.isReady ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-800">{preset.readyLabel ?? '구독자 세션 이식 필요'}</p>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-amber-700">
                관리자 훈련 모드에서는 준비되어 있으며, 구독자 세션 연결은 다음 작업에서 진행됩니다.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="border-t border-slate-100 p-6 sm:px-8">
          <button
            type="button"
            onClick={launch}
            disabled={!preset.isReady}
            className={`inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-sm font-black shadow-lg transition ${
              preset.isReady
                ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-500'
                : 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none'
            }`}
          >
            <MonitorPlay className="h-5 w-5" />
            {preset.isReady ? '큰 화면으로 실행' : (preset.readyLabel ?? '이식 필요')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function SpomoveHubView() {
  const drillsLoaded = useMasterStore((state) => state.drillsLoaded);
  const drillsError = useMasterStore((state) => state.drillsError);
  const { list: bgmList } = useSpomoveTrainingBGM();
  const [selectedPreset, setSelectedPreset] = useState<OfficialSpomovePreset | null>(null);

  if (drillsLoaded && drillsError) {
    const message =
      drillsError === 'unauthorized'
        ? '로그인 후 SPOMOVE를 이용할 수 있습니다.'
        : drillsError === 'forbidden'
          ? '이용 기간이 종료되어 SPOMOVE를 실행할 수 없습니다.'
          : 'SPOMOVE 이용 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="flex h-full items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16">
        <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <h1 className="mt-4 text-xl font-black text-slate-950">SPOMOVE를 실행할 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">
            이용권 확인
          </Link>
        </section>
      </main>
    );
  }

  const reactionCognitionPresets = OFFICIAL_SPOMOVE_LIBRARY.filter(
    (p) => p.programGroup === 'reaction-cognition',
  );
  const representativePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(
    (p) => p.programGroup !== 'reaction-cognition',
  );

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-14">
        <header className="overflow-hidden rounded-[30px] bg-slate-950 px-6 py-9 text-white shadow-xl sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-indigo-100">
            <MonitorPlay className="h-4 w-4" />
            공식 라이브러리
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            SPOMOVE 공식 프로그램을 큰 화면으로 실행하세요.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/60">
            검증된 공식 세팅으로 바로 실행하는 구독자용 SPOMOVE 라이브러리입니다. 기존 반응인지 4개와 반응·주의·실행 대표 프로그램을 함께 제공합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-black text-white/80">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <Clock3 className="h-4 w-4" />
              3초 고정 / 20회 고정
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <Music2 className="h-4 w-4" />
              BGM 자동 재생
            </span>
          </div>
        </header>

        <section className="mt-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">반응인지 공식</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">반응인지 공식 4개</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">기존 SPOMOVE 반응인지 엔진의 1~4번 활동입니다.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {reactionCognitionPresets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onConfigure={setSelectedPreset} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">대표 프로그램</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">반응·주의·실행 대표 프로그램 5개</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              각 인지운동 축의 핵심 1번 프로그램입니다. 주의·실행 영역은 구독자 세션 이식 후 실행 가능합니다.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {representativePresets.map((preset) => (
              <PresetCard key={preset.id} preset={preset} onConfigure={setSelectedPreset} />
            ))}
          </div>
        </section>
      </div>

      {selectedPreset ? (
        <PresetModal preset={selectedPreset} bgmList={bgmList} onClose={() => setSelectedPreset(null)} />
      ) : null}
    </main>
  );
}
