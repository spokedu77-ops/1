'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { SPOMOVE_HOME_FEATURED_SLOT_COUNT } from '@/app/lib/spomove/spomoveOfficialAssets';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  type OfficialSpomovePreset,
} from '@/app/spokedu-master/spomove/officialSpomovePresets';

const koreanTitleCollator = new Intl.Collator('ko');

const READY_PRESETS = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.isReady);

function SlotSpomoveCombobox({
  selectedId,
  selectedElsewhere,
  disabled,
  onSelect,
}: {
  selectedId: string | null;
  selectedElsewhere: Set<string>;
  disabled?: boolean;
  onSelect: (presetId: string | null) => void;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const selected = READY_PRESETS.find((preset) => preset.id === selectedId) ?? null;
  const inputValue = open ? query : selected?.title ?? '';

  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return READY_PRESETS.filter((preset) => {
      if (selectedElsewhere.has(preset.id) && preset.id !== selectedId) return false;
      if (!normalized) return true;
      const text =
        `${preset.title} ${preset.programTitle} ${preset.axisTitle} ${preset.id}`.toLowerCase();
      return text.includes(normalized);
    }).sort((a, b) => {
      const titleCompare = koreanTitleCollator.compare(a.title.trim(), b.title.trim());
      return titleCompare || a.id.localeCompare(b.id);
    });
  }, [query, selectedElsewhere, selectedId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open, options]);

  const choose = (presetId: string | null) => {
    onSelect(presetId);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((current) => {
        if (current < 0) return 0;
        return Math.min(current + 1, Math.max(options.length - 1, 0));
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((current) => {
        if (current <= 0) return -1;
        return current - 1;
      });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (highlight < 0) {
        choose(null);
        return;
      }
      const item = options[highlight];
      if (item) choose(item.id);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={rootRef} className="relative mt-2">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        disabled={disabled}
        value={inputValue}
        placeholder="이름·축·ID로 검색"
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-900 outline-none focus:border-indigo-400 disabled:opacity-50"
      />
      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <li
            role="option"
            aria-selected={highlight < 0}
            data-active={highlight < 0 ? 'true' : undefined}
            className={`cursor-pointer px-3 py-2 text-[12px] font-semibold ${
              highlight < 0 ? 'bg-indigo-50 text-indigo-800' : 'text-slate-500'
            }`}
            onMouseEnter={() => setHighlight(-1)}
            onMouseDown={(event) => {
              event.preventDefault();
              choose(null);
            }}
          >
            비우기 (자동 추천)
          </li>
          {options.map((preset, index) => (
            <li
              key={preset.id}
              role="option"
              aria-selected={highlight === index}
              data-active={highlight === index ? 'true' : undefined}
              className={`cursor-pointer px-3 py-2 ${
                highlight === index ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(preset.id);
              }}
            >
              <p className="text-[13px] font-black text-slate-900">{preset.title}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                {preset.axisTitle} · {preset.programTitle}
              </p>
            </li>
          ))}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-[12px] font-semibold text-slate-400">검색 결과 없음</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function SpomoveHomeFeaturedManager() {
  const [slots, setSlots] = useState<Array<string | null>>(
    Array.from({ length: SPOMOVE_HOME_FEATURED_SLOT_COUNT }, () => null),
  );
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSlots = async () => {
      try {
        const res = await fetch('/api/admin/spokedu-master/spomove/home-featured', {
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          slots?: Array<string | null>;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? 'SPOMOVE 추천 슬롯을 불러오지 못했습니다.');
        if (active) {
          setSlots(
            Array.from(
              { length: SPOMOVE_HOME_FEATURED_SLOT_COUNT },
              (_, index) => json.slots?.[index] ?? null,
            ),
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'SPOMOVE 추천 슬롯을 불러오지 못했습니다.',
        );
      } finally {
        if (active) setLoadingSlots(false);
      }
    };
    void loadSlots();
    return () => {
      active = false;
    };
  }, []);

  const updateSlot = (index: number, presetId: string | null) => {
    setSlots((current) => {
      if (
        presetId != null &&
        current.some((id, slotIndex) => slotIndex !== index && id === presetId)
      ) {
        toast.error('같은 SPOMOVE를 여러 추천 슬롯에 선택할 수 없습니다.');
        return current;
      }
      return current.map((id, slotIndex) => (slotIndex === index ? presetId : id));
    });
  };

  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/spomove/home-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const json = (await res.json()) as {
        slots?: Array<string | null>;
        message?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'SPOMOVE 추천 슬롯 저장에 실패했습니다.');
      setSlots(
        Array.from(
          { length: SPOMOVE_HOME_FEATURED_SLOT_COUNT },
          (_, index) => json.slots?.[index] ?? null,
        ),
      );
      toast.success(json.message ?? '홈 SPOMOVE 추천 슬롯을 저장했습니다.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'SPOMOVE 추천 슬롯 저장에 실패했습니다.',
      );
    } finally {
      setSavingSlots(false);
    }
  };

  const selectedLabel = (presetId: string | null): OfficialSpomovePreset | null =>
    presetId ? (READY_PRESETS.find((preset) => preset.id === presetId) ?? null) : null;

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">
              Home SPOMOVE
            </p>
            <h2 className="mt-1 text-[17px] font-black text-slate-950">
              홈 SPOMOVE 추천 관리
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
              대시보드 「SPOMOVE」 4칸에 노출됩니다. 이름·축·ID로 검색해 고르세요. 빈 슬롯은
              자동 추천으로 보완됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSlots()}
            disabled={loadingSlots || savingSlots}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-[12px] font-black text-white disabled:opacity-50"
          >
            <Save size={14} />
            {savingSlots ? '추천 저장 중' : '추천 슬롯 저장'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {slots.map((selectedId, index) => {
            const selectedElsewhere = new Set(
              slots.filter((id, slotIndex): id is string => slotIndex !== index && id != null),
            );
            const preset = selectedLabel(selectedId);

            return (
              <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-black text-slate-900">
                    {index + 1}번 추천 슬롯
                  </p>
                  {selectedId != null ? (
                    <button
                      type="button"
                      onClick={() => updateSlot(index, null)}
                      className="text-[11px] font-black text-slate-400 hover:text-rose-600"
                    >
                      비우기
                    </button>
                  ) : null}
                </div>
                <SlotSpomoveCombobox
                  selectedId={selectedId}
                  selectedElsewhere={selectedElsewhere}
                  disabled={loadingSlots}
                  onSelect={(presetId) => updateSlot(index, presetId)}
                />
                {preset ? (
                  <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                    {preset.axisTitle} · {preset.id}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] font-bold text-slate-400">비어 있음</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
