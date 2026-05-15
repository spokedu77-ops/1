'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { ChevronLeft, Save, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import catalog from '@/app/lib/spomove/core5Catalog';

type DrillMeta = {
  drill_id: string;
  display_name: string | null;
  sm_tags: string[];
  is_pro: boolean;
  is_visible: boolean;
  display_order: number;
  engine_mode: string | null;
  engine_level: number | null;
};

type DrillItem = {
  drillId: string;
  title: string;
  seriesTitle: string;
  seriesCode: string;
  defaultEngine: { mode: string; level: number } | null;
  meta: DrillMeta | null;
};

const TAG_PRESETS = ['민첩성', '협응력', '시각반응', '방향전환', '기억력', '리듬', '초급', '중급', '고급'];

function EditPanel({
  item,
  onSave,
  onClose,
}: {
  item: DrillItem;
  onSave: (updated: DrillMeta) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(item.meta?.display_name ?? '');
  const [tags, setTags] = useState<string[]>(item.meta?.sm_tags ?? []);
  const [isPro, setIsPro] = useState(item.meta?.is_pro ?? false);
  const [isVisible, setIsVisible] = useState(item.meta?.is_visible ?? true);
  const [displayOrder, setDisplayOrder] = useState(item.meta?.display_order ?? 0);
  const [engineMode, setEngineMode] = useState(item.meta?.engine_mode ?? item.defaultEngine?.mode ?? '');
  const [engineLevel, setEngineLevel] = useState(item.meta?.engine_level ?? item.defaultEngine?.level ?? 1);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const patch: DrillMeta = {
        drill_id: item.drillId,
        display_name: displayName.trim() || null,
        sm_tags: tags,
        is_pro: isPro,
        is_visible: isVisible,
        display_order: displayOrder,
        engine_mode: engineMode.trim() || null,
        engine_level: engineMode.trim() ? engineLevel : null,
      };
      const { error } = await supabase
        .from('spokedu_master_drill_meta')
        .upsert(patch, { onConflict: 'drill_id' });
      if (error) throw error;
      toast.success('저장 완료');
      onSave(patch);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[440px] flex-col overflow-y-auto"
        style={{ background: '#111827', borderLeft: '1px solid #1f2937' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#1f2937] px-5 py-4">
          <h2 className="text-[15px] font-bold text-white">드릴 메타 편집</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: '#1f2937' }}>
            <X size={16} color="#9ca3af" />
          </button>
        </header>

        <div className="flex-1 space-y-5 px-5 py-5">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">원본 이름 (읽기 전용)</p>
            <p className="text-[14px] font-semibold text-gray-200">{item.title} <span className="text-gray-600">({item.drillId})</span></p>
            <p className="mt-0.5 text-[11px] text-gray-600">{item.seriesTitle} 시리즈</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">표시 이름 오버라이드</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="비워두면 원본 이름 사용"
              className="h-9 w-full rounded-lg border px-3 text-[13px] outline-none"
              style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">태그</p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_PRESETS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: tags.includes(tag) ? 'rgba(99,102,241,0.18)' : '#1f2937',
                    color: tags.includes(tag) ? '#a5b4fc' : '#9ca3af',
                    border: tags.includes(tag) ? '1px solid rgba(99,102,241,0.4)' : '1px solid #374151',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">엔진 설정</p>
            <div className="rounded-xl p-3" style={{ background: '#1a2236', border: '1px solid #374151' }}>
              <p className="mb-2 text-[11px] text-gray-500">카탈로그 기본값: {item.defaultEngine ? `mode=${item.defaultEngine.mode} / level=${item.defaultEngine.level}` : '없음'}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600">mode</label>
                  <input
                    value={engineMode}
                    onChange={(e) => setEngineMode(e.target.value)}
                    placeholder="예: reactTrain"
                    className="h-8 w-full rounded-lg border px-2.5 text-[12px] outline-none"
                    style={{ background: '#111827', borderColor: '#374151', color: '#e5e7eb' }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600">level</label>
                  <input
                    type="number"
                    min={1}
                    value={engineLevel}
                    onChange={(e) => setEngineLevel(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border px-2.5 text-[12px] outline-none"
                    style={{ background: '#111827', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">표시 순서</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {(['isPro', 'isVisible'] as const).map((key) => {
              const labels = { isPro: 'PRO 전용', isVisible: '노출' };
              const values = { isPro: isPro, isVisible: isVisible };
              const setters = { isPro: setIsPro, isVisible: setIsVisible };
              const active = values[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setters[key](!active)}
                  className="flex-1 rounded-lg py-2 text-[12px] font-bold"
                  style={{
                    background: active ? 'rgba(99,102,241,0.18)' : '#1f2937',
                    color: active ? '#a5b4fc' : '#9ca3af',
                    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid #374151',
                  }}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-[#1f2937] px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50"
            style={{ background: '#6366f1' }}
          >
            <Save size={16} />
            {saving ? '저장 중...' : '저장'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function AdminSmDrillsPage() {
  const [items, setItems] = useState<DrillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DrillItem | null>(null);

  const buildItems = useCallback((metaMap: Map<string, DrillMeta>): DrillItem[] => {
    const result: DrillItem[] = [];
    for (const series of catalog) {
      for (const program of series.programs) {
        const firstEngine = program.stages.find((s) => s.engine != null)?.engine ?? null;
        result.push({
          drillId: program.programId,
          title: program.title,
          seriesTitle: series.title,
          seriesCode: series.code,
          defaultEngine: firstEngine,
          meta: metaMap.get(program.programId) ?? null,
        });
      }
    }
    return result;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: metaRows } = await supabase.from('spokedu_master_drill_meta').select('*');
    const metaMap = new Map<string, DrillMeta>();
    for (const m of (metaRows ?? []) as DrillMeta[]) metaMap.set(m.drill_id, m);
    setItems(buildItems(metaMap));
    setLoading(false);
  }, [buildItems]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = (updated: DrillMeta) => {
    setItems((prev) =>
      prev.map((item) => item.drillId === updated.drill_id ? { ...item, meta: updated } : item)
    );
    setEditing(null);
  };

  const seriesGroups = items.reduce<Record<string, DrillItem[]>>((acc, item) => {
    const key = `${item.seriesCode} ${item.seriesTitle}`;
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <header className="sticky top-0 z-20 border-b border-[#1f2937] px-6 py-4" style={{ background: '#0d1117' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin/spokedu-master" className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: '#1f2937' }}>
            <ChevronLeft size={16} color="#9ca3af" />
          </Link>
          <div>
            <h1 className="text-[16px] font-bold text-white">SPOMOVE 드릴 메타 편집</h1>
            <p className="text-[12px] text-gray-500">Core5Catalog → spokedu-master 커스터마이징</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Zap size={15} color="#6366f1" />
            <span className="text-[13px] font-semibold text-gray-300">{items.length}개</span>
          </div>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(seriesGroups).map(([groupTitle, groupItems]) => (
              <section key={groupTitle}>
                <h2 className="mb-3 text-[12px] font-black uppercase tracking-[0.1em] text-indigo-400">{groupTitle}</h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groupItems.map((item) => (
                    <div
                      key={item.drillId}
                      className="rounded-xl p-3"
                      style={{ background: '#111827', border: '1px solid #1f2937' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-white">
                            {item.meta?.display_name ?? item.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-gray-500">{item.drillId}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
                          style={{ background: '#1f2937', color: '#9ca3af' }}
                        >
                          편집
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.meta?.is_pro ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}
                        {item.meta && !item.meta.is_visible ? <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-500">숨김</span> : null}
                        {item.meta?.engine_mode ? <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>엔진: {item.meta.engine_mode}</span> : item.defaultEngine ? <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-500">기본 엔진</span> : null}
                        {(item.meta?.sm_tags ?? []).map((tag) => (
                          <span key={tag} className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {editing ? <EditPanel item={editing} onSave={handleSave} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
