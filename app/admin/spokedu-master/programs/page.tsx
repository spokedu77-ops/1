'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { ChevronLeft, Save, Tag, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const SM_THEMES = ['민첩성', '협응력', '균형감각', '심폐지구력', '협동', '표현 활동', '리듬 반응', '공간 인지', '일반'];
const SM_GRADES = ['유아', '초등 저학년', '초등 고학년', '전학년'];
const SM_SPACES = ['좁은 공간', '넓은 공간', '실내', '실외 가능'];
const TAG_PRESETS = ['유아', '초등', 'SPOMOVE', '민첩성', '협동', '준비물 없음', '좁은 공간', '넓은 공간', '리듬', '균형'];

type CurriculumRow = {
  id: number;
  title: string | null;
  month: number | null;
  week: number | null;
  display_order: number | null;
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[];
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
  sm_duration: number | null;
  sm_is_pro: boolean;
  sm_is_new: boolean;
  sm_is_hot: boolean;
  sm_display_order: number;
  sm_objective: string | null;
  sm_development_focus: string | null;
  sm_coach_script: string | null;
  sm_parent_note: string | null;
  sm_related_spomove_ids: string[] | null;
};

type ProgramItem = CurriculumRow & { meta: MetaRow | null };

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors"
      style={{
        background: active ? 'rgba(99,102,241,0.18)' : '#1f2937',
        color: active ? '#a5b4fc' : '#9ca3af',
        border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid #374151',
      }}
    >
      {label}
    </button>
  );
}

function EditPanel({
  item,
  onSave,
  onClose,
}: {
  item: ProgramItem;
  onSave: (updated: MetaRow) => void;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<string[]>(item.meta?.sm_tags ?? []);
  const [theme, setTheme] = useState(item.meta?.sm_theme ?? '');
  const [grade, setGrade] = useState(item.meta?.sm_grade ?? '');
  const [space, setSpace] = useState(item.meta?.sm_space ?? '');
  const [duration, setDuration] = useState(item.meta?.sm_duration ?? 20);
  const [isPro, setIsPro] = useState(item.meta?.sm_is_pro ?? false);
  const [isNew, setIsNew] = useState(item.meta?.sm_is_new ?? false);
  const [isHot, setIsHot] = useState(item.meta?.sm_is_hot ?? false);
  const [displayOrder, setDisplayOrder] = useState(item.meta?.sm_display_order ?? 0);
  const [objective, setObjective] = useState(item.meta?.sm_objective ?? '');
  const [developmentFocus, setDevelopmentFocus] = useState(item.meta?.sm_development_focus ?? '');
  const [coachScript, setCoachScript] = useState(item.meta?.sm_coach_script ?? '');
  const [parentNote, setParentNote] = useState(item.meta?.sm_parent_note ?? '');
  const [spomoveIds, setSpomoveIds] = useState((item.meta?.sm_related_spomove_ids ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const patch = {
        curriculum_id: item.id,
        sm_tags: tags,
        sm_theme: theme || null,
        sm_grade: grade || null,
        sm_space: space || null,
        sm_duration: duration,
        sm_is_pro: isPro,
        sm_is_new: isNew,
        sm_is_hot: isHot,
        sm_display_order: displayOrder,
        sm_objective: objective || null,
        sm_development_focus: developmentFocus || null,
        sm_coach_script: coachScript || null,
        sm_parent_note: parentNote || null,
        sm_related_spomove_ids: spomoveIds ? spomoveIds.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      const { error } = await supabase
        .from('spokedu_master_program_meta')
        .upsert(patch, { onConflict: 'curriculum_id' });
      if (error) throw error;
      toast.success('저장 완료');
      onSave(patch as MetaRow);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[480px] flex-col overflow-y-auto"
        style={{ background: '#111827', borderLeft: '1px solid #1f2937' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#1f2937] px-5 py-4">
          <h2 className="text-[15px] font-bold text-white">프로그램 메타 편집</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: '#1f2937' }}>
            <X size={16} color="#9ca3af" />
          </button>
        </header>

        <div className="flex-1 space-y-5 px-5 py-5">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">원본 제목 (읽기 전용)</p>
            <p className="text-[14px] font-semibold text-gray-200">{item.title ?? `커리큘럼 #${item.id}`}</p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">태그</p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_PRESETS.map((tag) => (
                <TagChip key={tag} label={tag} active={tags.includes(tag)} onClick={() => toggleTag(tag)} />
              ))}
            </div>
          </div>

          <div className="h-px" style={{ background: '#1f2937' }} />

          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">수업 콘텐츠</p>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-gray-600">수업 목표</label>
              <input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="방향 전환, 공간 인지, 빠른 출발 반응"
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-gray-600">발달 포인트</label>
              <input
                value={developmentFocus}
                onChange={(e) => setDevelopmentFocus(e.target.value)}
                placeholder="민첩성 / 시각 신호 반응 / 하체 협응"
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-gray-600">SPOMOVE 연계 ID (쉼표 구분)</label>
              <input
                value={spomoveIds}
                onChange={(e) => setSpomoveIds(e.target.value)}
                placeholder="speed-track, direction-shift"
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-gray-600">코치 스크립트</label>
              <textarea
                value={coachScript}
                onChange={(e) => setCoachScript(e.target.value)}
                placeholder="처음에는 속도보다 동선 이해를 먼저 확인하고..."
                rows={3}
                className="w-full resize-none rounded-lg border px-2.5 py-2 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-gray-600">학부모 문구</label>
              <textarea
                value={parentNote}
                onChange={(e) => setParentNote(e.target.value)}
                placeholder="오늘은 방향 신호를 보고 몸을 빠르게 전환하는 활동을 했습니다."
                rows={3}
                className="w-full resize-none rounded-lg border px-2.5 py-2 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
              />
            </div>
          </div>

          <div className="h-px" style={{ background: '#1f2937' }} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">테마</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              >
                <option value="">선택 안 함</option>
                {SM_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">대상</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              >
                <option value="">선택 안 함</option>
                {SM_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">공간</label>
              <select
                value={space}
                onChange={(e) => setSpace(e.target.value)}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              >
                <option value="">선택 안 함</option>
                {SM_SPACES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">시간(분)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">표시 순서</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="h-9 w-full rounded-lg border px-2.5 text-[13px] font-medium outline-none"
                style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb', colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            {(['isPro', 'isNew', 'isHot'] as const).map((key) => {
              const labels = { isPro: 'PRO 전용', isNew: 'NEW', isHot: 'HOT' };
              const values = { isPro: isPro, isNew: isNew, isHot: isHot };
              const setters = { isPro: setIsPro, isNew: setIsNew, isHot: setIsHot };
              const active = values[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setters[key](!active)}
                  className="flex-1 rounded-lg py-2 text-[12px] font-bold transition-colors"
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

function ProgramCard({
  item,
  onEdit,
}: {
  item: ProgramItem;
  onEdit: () => void;
}) {
  const meta = item.meta;
  const title = (item.title ?? '').trim() || `커리큘럼 #${item.id}`;

  return (
    <div
      className="rounded-xl p-3 transition-colors hover:bg-[#1a2236]"
      style={{ background: '#111827', border: '1px solid #1f2937' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-white">{title}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">ID {item.id}{item.month ? ` · ${item.month}월${item.week ?? 0}주` : ''}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
          style={{ background: '#1f2937', color: '#9ca3af' }}
        >
          편집
        </button>
      </div>
      {meta ? (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {meta.sm_is_pro ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>PRO</span> : null}
          {meta.sm_is_new ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7' }}>NEW</span> : null}
          {meta.sm_is_hot ? <span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.12)', color: '#fcd34d' }}>HOT</span> : null}
          {meta.sm_theme ? <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-400">{meta.sm_theme}</span> : null}
          {meta.sm_grade ? <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-400">{meta.sm_grade}</span> : null}
          {(meta.sm_tags ?? []).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-800 px-2 py-0.5 text-[9px] font-semibold text-gray-400">{tag}</span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-gray-600">메타 없음 — 편집하면 자동 생성</p>
      )}
    </div>
  );
}

export default function AdminSmProgramsPage() {
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProgramItem | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [{ data: currRows }, { data: metaRows }] = await Promise.all([
      supabase
        .from('curriculum')
        .select('id,title,month,week,display_order')
        .eq('is_sub', false)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('id', { ascending: false }),
      supabase.from('spokedu_master_program_meta').select('*'),
    ]);

    const metaMap = new Map<number, MetaRow>();
    for (const m of (metaRows ?? []) as MetaRow[]) metaMap.set(m.curriculum_id, m);

    setItems(
      (currRows ?? []).map((r: CurriculumRow) => ({ ...r, meta: metaMap.get(r.id) ?? null }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = query
    ? items.filter((item) => (item.title ?? '').toLowerCase().includes(query.toLowerCase()) || String(item.id).includes(query))
    : items;

  const handleSave = (updated: MetaRow) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === updated.curriculum_id ? { ...item, meta: updated } : item
      )
    );
    setEditing(null);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0d1117', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      <header className="sticky top-0 z-20 border-b border-[#1f2937] px-6 py-4" style={{ background: '#0d1117' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin/spokedu-master" className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: '#1f2937' }}>
            <ChevronLeft size={16} color="#9ca3af" />
          </Link>
          <div>
            <h1 className="text-[16px] font-bold text-white">프로그램 메타 편집</h1>
            <p className="text-[12px] text-gray-500">curriculum → spokedu-master 커스터마이징 레이어</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Tag size={15} color="#6366f1" />
            <span className="text-[13px] font-semibold text-gray-300">{items.length}개</span>
          </div>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 또는 ID 검색"
          className="mt-3 h-9 w-full rounded-lg border px-3 text-[13px] outline-none"
          style={{ background: '#1f2937', borderColor: '#374151', color: '#e5e7eb' }}
        />
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <ProgramCard key={item.id} item={item} onEdit={() => setEditing(item)} />
            ))}
          </div>
        )}
      </main>

      {editing ? (
        <EditPanel item={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
