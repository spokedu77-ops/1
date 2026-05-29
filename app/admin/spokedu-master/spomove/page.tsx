'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Eye, EyeOff, Play, Save, Trash2 } from 'lucide-react';
import { MODES, SPOMOVE_CATALOG_SLOT_IDS, isSpomoveCatalogTbdMode } from '@/app/admin/spomove/training/_player/constants';
import { isSupportedMasterEngineMode } from '@/app/spokedu-master/lib/spomovePresets';
import type { SpomoveLaunchPreset } from '@/app/spokedu-master/types';

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return rest ? `${min}분 ${rest}초` : `${min}분`;
}

function PresetManager() {
  const [presets, setPresets] = useState<SpomoveLaunchPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spokedu-master/spomove-presets?admin=1');
      const json = await res.json() as { data?: SpomoveLaunchPreset[] };
      setPresets(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updatePreset = async (preset: SpomoveLaunchPreset, patch: Partial<SpomoveLaunchPreset>) => {
    setSavingId(preset.id);
    try {
      const res = await fetch('/api/spokedu-master/spomove-presets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: preset.id, ...patch }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const json = await res.json() as { data?: SpomoveLaunchPreset };
      if (json.data) {
        setPresets((prev) => prev.map((item) => item.id === preset.id ? json.data! : item).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setSavingId(null);
    }
  };

  const deletePreset = async (preset: SpomoveLaunchPreset) => {
    if (!window.confirm(`"${preset.title}" 프리셋을 삭제할까요?`)) return;
    setSavingId(preset.id);
    try {
      const res = await fetch(`/api/spokedu-master/spomove-presets?id=${encodeURIComponent(preset.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setPresets((prev) => prev.filter((item) => item.id !== preset.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '삭제 실패');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="mx-[22px] mb-8 rounded-[18px] p-4 sm:mx-8 lg:mx-10" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>official presets</p>
          <h2 className="mt-1 text-[20px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>공식 실행 프리셋 관리</h2>
          <p className="mt-1 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>
            구독자 SPOMOVE 홈 최상단에 노출되는 실행 세팅입니다. 숨김, 삭제, 순서, 문구를 여기서 정리합니다.
          </p>
        </div>
        <Link
          href="/admin/spomove/training"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center justify-center gap-2 rounded-[10px] px-3 text-[12px] font-black"
          style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
        >
          <ExternalLink size={14} />
          새 세팅 만들기
        </Link>
      </div>

      {loading ? (
        <div className="grid min-h-28 place-items-center text-[12px]" style={{ color: 'var(--spm-t3)' }}>불러오는 중</div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {presets.map((preset) => (
            <div key={preset.id} className="rounded-[14px] p-3" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{
                        background: isSupportedMasterEngineMode(preset.engineMode) ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                        color: isSupportedMasterEngineMode(preset.engineMode) ? '#6ee7b7' : '#fca5a5',
                      }}
                    >
                      {isSupportedMasterEngineMode(preset.engineMode) ? '구독 실행 가능' : '이식 필요'}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}>
                      {formatDuration(preset.durationSec)}
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: '#6ee7b7' }}>
                      {preset.engineMode} Lv.{preset.engineLevel}
                    </span>
                    {preset.isVisible === false ? (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--spm-t3)' }}>숨김</span>
                    ) : null}
                  </div>
                  <input
                    value={preset.title}
                    onChange={(e) => setPresets((prev) => prev.map((item) => item.id === preset.id ? { ...item, title: e.target.value } : item))}
                    className="mt-3 h-9 w-full rounded-[10px] border px-3 text-[13px] font-black outline-none"
                    style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                  />
                  <textarea
                    value={preset.subtitle}
                    onChange={(e) => setPresets((prev) => prev.map((item) => item.id === preset.id ? { ...item, subtitle: e.target.value } : item))}
                    rows={2}
                    className="mt-2 w-full resize-none rounded-[10px] border px-3 py-2 text-[12px] font-medium leading-5 outline-none"
                    style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t2)' }}
                  />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-[10px] font-black uppercase" style={{ color: 'var(--spm-t3)' }}>
                      순서
                      <input
                        type="number"
                        value={preset.displayOrder ?? 0}
                        onChange={(e) => setPresets((prev) => prev.map((item) => item.id === preset.id ? { ...item, displayOrder: Number(e.target.value) } : item))}
                        className="mt-1 h-8 w-full rounded-[9px] border px-2 text-[12px] outline-none"
                        style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                      />
                    </label>
                    <label className="text-[10px] font-black uppercase" style={{ color: 'var(--spm-t3)' }}>
                      시간
                      <input
                        type="number"
                        value={preset.durationSec}
                        onChange={(e) => setPresets((prev) => prev.map((item) => item.id === preset.id ? { ...item, durationSec: Number(e.target.value) } : item))}
                        className="mt-1 h-8 w-full rounded-[9px] border px-2 text-[12px] outline-none"
                        style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                      />
                    </label>
                    <label className="text-[10px] font-black uppercase" style={{ color: 'var(--spm-t3)' }}>
                      속도
                      <input
                        type="number"
                        step="0.1"
                        value={preset.speedSec}
                        onChange={(e) => setPresets((prev) => prev.map((item) => item.id === preset.id ? { ...item, speedSec: Number(e.target.value) } : item))}
                        className="mt-1 h-8 w-full rounded-[9px] border px-2 text-[12px] outline-none"
                        style={{ background: 'var(--spm-s2)', borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => updatePreset(preset, { isVisible: preset.isVisible === false })}
                    disabled={savingId === preset.id}
                    className="grid h-9 w-9 place-items-center rounded-[10px]"
                    style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t2)' }}
                    title={preset.isVisible === false ? '노출' : '숨김'}
                  >
                    {preset.isVisible === false ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePreset(preset, preset)}
                    disabled={savingId === preset.id}
                    className="grid h-9 w-9 place-items-center rounded-[10px]"
                    style={{ background: '#4f46e5', color: '#fff' }}
                    title="저장"
                  >
                    <Save size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePreset(preset)}
                    disabled={savingId === preset.id}
                    className="grid h-9 w-9 place-items-center rounded-[10px]"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.24)', color: '#fca5a5' }}
                    title="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ModeCard({ modeId }: { modeId: string }) {
  const mode = MODES[modeId];
  if (!mode || isSpomoveCatalogTbdMode(modeId)) return null;

  const firstLevel = mode.levels[0];

  return (
    <div
      className="rounded-[14px] p-4"
      style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="text-[22px]">{mode.icon}</span>
          <h2 className="mt-1 text-[15px] font-black leading-tight" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>
            {mode.title}
          </h2>
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: mode.accent }}>
            {mode.tag}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black"
          style={{ background: `${mode.accent}20`, color: mode.accent, border: `1px solid ${mode.accent}44` }}
        >
          {mode.coreCode}
        </span>
      </div>
      <p className="mb-3 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{mode.desc}</p>
      <div className="mb-3 flex flex-wrap gap-1">
        {mode.levels.map((level) => (
          <Link
            key={level.id}
            href={`/admin/spomove/training/_player?mode=${modeId}&level=${level.id}`}
            className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold"
            style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}
          >
            <Play size={9} fill="currentColor" />
            {level.name}
          </Link>
        ))}
      </div>
      {firstLevel ? (
        <Link
          href={`/admin/spomove/training/_player?mode=${modeId}&level=${firstLevel.id}`}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-black text-white"
          style={{ background: mode.accent }}
        >
          <Play size={13} fill="#fff" />
          1단계 바로 실행
        </Link>
      ) : null}
    </div>
  );
}

export default function AdminSpokeduMasterSpomovePage() {
  const visibleSlots = SPOMOVE_CATALOG_SLOT_IDS.filter((id) => !isSpomoveCatalogTbdMode(id));

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>screen movement engine</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          실제 SPOMOVE 훈련 모드 {visibleSlots.length}종 · 각 모드를 클릭해 어드민 플레이어에서 바로 실행합니다.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/admin/spomove/training"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-2 rounded-[10px] px-3 text-[12px] font-black"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
          >
            <ExternalLink size={14} />
            SPOMOVE 전체 관리 (새 탭)
          </Link>
        </div>
      </header>

      <PresetManager />

      <div className="grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-3 xl:grid-cols-4 lg:px-10">
        {visibleSlots.map((id) => (
          <ModeCard key={id} modeId={id} />
        ))}
      </div>
    </div>
  );
}
