'use client';

import { Clock3, Lock, MonitorPlay, Music2, Settings2, Volume2, VolumeX, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSpomoveTrainingBGM } from '@/app/lib/admin/hooks/useSpomoveTrainingBGM';

import { useMasterStore } from '../store';
import {
  bgmDisplayName,
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialCueSeconds,
  type OfficialRounds,
  type OfficialSpomovePreset,
} from './officialSpomovePresets';

function PresetCard({
  preset,
  bgmAvailable,
  onConfigure,
}: {
  preset: OfficialSpomovePreset;
  bgmAvailable: boolean;
  onConfigure: (preset: OfficialSpomovePreset) => void;
}) {
  return (
    <article className="flex min-h-[330px] flex-col justify-between rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
          {preset.category}
        </span>
        <h2 className="mt-5 text-2xl font-black leading-tight text-slate-950">{preset.title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{preset.description}</p>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-black text-slate-400">기본 설정</p>
            <p className="mt-1 text-sm font-black text-slate-900">3초 / 20회</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-black text-slate-400">BGM</p>
            <p className="mt-1 text-sm font-black text-slate-900">{bgmAvailable ? '선택 가능' : '사용 안 함'}</p>
          </div>
        </div>
        <div className="mt-2 rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-black text-slate-400">사용 장면</p>
          <p className="mt-1 text-sm font-bold leading-5 text-slate-800">{preset.recommendedUse}</p>
        </div>
        <button
          type="button"
          onClick={() => onConfigure(preset)}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-indigo-600"
        >
          <Settings2 className="h-4 w-4" />
          설정하고 실행
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
  const [cueSeconds, setCueSeconds] = useState<OfficialCueSeconds>(preset.defaultCueSeconds);
  const [rounds, setRounds] = useState<OfficialRounds>(preset.defaultRounds);
  const [bgmPath, setBgmPath] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const launch = () => {
    router.push(
      officialPresetSessionHref({
        preset,
        cueSeconds,
        rounds,
        bgmPath: bgmPath || undefined,
        soundEnabled,
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="spomove-preset-title">
      <button type="button" className="fixed inset-0 cursor-default" onClick={onClose} aria-label="설정 닫기" />
      <section className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-indigo-600">SPOMOVE 공식 preset</p>
              <h2 id="spomove-preset-title" className="mt-2 text-2xl font-black text-slate-950">
                {preset.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{preset.description}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label="닫기">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <section>
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Quick Facts</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['유형', '반응인지'],
                ['기본 간격', '3초'],
                ['반복 횟수', '20회'],
                ['BGM', bgmList.length > 0 ? '선택 가능' : '사용 안 함'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[11px] font-black text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-slate-950">신호 간격</h3>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {preset.allowedCueSeconds.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCueSeconds(value)}
                  className={`h-11 rounded-xl text-sm font-black ${cueSeconds === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {value}초
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-slate-950">반복 횟수</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {preset.allowedRounds.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRounds(value)}
                  className={`h-11 rounded-xl text-sm font-black ${rounds === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {value}회
                </button>
              ))}
            </div>
          </section>

          {bgmList.length > 0 ? (
            <section>
              <label htmlFor="spomove-bgm" className="text-sm font-black text-slate-950">
                BGM 선택
              </label>
              <div className="relative mt-3">
                <Music2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="spomove-bgm"
                  value={bgmPath}
                  onChange={(event) => setBgmPath(event.target.value)}
                  className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400"
                >
                  <option value="">BGM 끄기</option>
                  {bgmList.map((path) => (
                    <option key={path} value={path}>
                      {bgmDisplayName(path)}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          ) : null}

          <section className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <div>
              <h3 className="text-sm font-black text-slate-950">효과음 / 신호음</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">신호 전환음과 종료 알림음을 설정합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled((value) => !value)}
              className={`inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black ${soundEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {soundEnabled ? '켜짐' : '꺼짐'}
            </button>
          </section>
        </div>

        <footer className="border-t border-slate-100 p-6 sm:px-8">
          <button type="button" onClick={launch} className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500">
            <MonitorPlay className="h-5 w-5" />
            큰 화면으로 실행
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function SpomoveHubView() {
  const drillsLoaded = useMasterStore((state) => state.drillsLoaded);
  const drillsError = useMasterStore((state) => state.drillsError);
  const { list: bgmList, loading: bgmLoading } = useSpomoveTrainingBGM();
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

  return (
    <main className="h-full overflow-y-auto bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-14">
        <header className="overflow-hidden rounded-[30px] bg-slate-950 px-6 py-9 text-white shadow-xl sm:px-10 sm:py-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-indigo-100">
            <MonitorPlay className="h-4 w-4" />
            공식 preset 라이브러리
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">반응인지 활동을 설정하고 큰 화면으로 실행하세요.</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/60">
            기존 SPOMOVE 반응인지 엔진의 1~4번 활동입니다. 신호 간격과 반복 횟수, BGM, 효과음을 실행 전에 선택할 수 있습니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-black text-white/80">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
              <Clock3 className="h-4 w-4" />
              기본 3초 / 20회
            </span>
            {!bgmLoading && bgmList.length > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3">
                <Music2 className="h-4 w-4" />
                Asset Hub BGM 선택 가능
              </span>
            ) : null}
          </div>
        </header>

        <section className="mt-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">Official presets</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">반응인지 공식 preset 4개</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">각 카드는 기존 SPOMOVE `basic` 엔진의 해당 레벨을 그대로 실행합니다.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {OFFICIAL_SPOMOVE_LIBRARY.map((preset) => (
              <PresetCard key={preset.id} preset={preset} bgmAvailable={bgmList.length > 0} onConfigure={setSelectedPreset} />
            ))}
          </div>
        </section>
      </div>

      {selectedPreset ? <PresetModal preset={selectedPreset} bgmList={bgmList} onClose={() => setSelectedPreset(null)} /> : null}
    </main>
  );
}
