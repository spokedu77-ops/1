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
import { SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT } from '@/app/lib/spomove/spomoveOfficialAssets';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  type OfficialSpomovePreset,
} from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { isHubListedPreset } from '@/app/spokedu-master/spomove/movements/isHubVisiblePreset';
import {
  SPOMOVE_CATALOG_FAMILIES,
  type SpomoveCatalogFamilyId,
} from '@/app/spokedu-master/spomove/spomoveCatalogFamilies';
import { getSpomovePresetDisplayModel } from '@/app/spokedu-master/spomove/spomovePresetDisplayModel';
import {
  emptyHubFamilyFeaturedSlots,
  type SpomoveHubFamilyFeaturedSlots,
} from '@/app/spokedu-master/lib/spomoveHubFamilyFeatured';
import { readAdminJsonSafe } from './readAdminJsonSafe';

const koreanTitleCollator = new Intl.Collator('ko');

function familyPresets(familyId: SpomoveCatalogFamilyId) {
  const family = SPOMOVE_CATALOG_FAMILIES.find((item) => item.id === familyId);
  if (!family) return [];
  return OFFICIAL_SPOMOVE_LIBRARY.filter(
    (preset) => isHubListedPreset(preset) && family.programGroups.includes(preset.programGroup),
  );
}

function buildPresetAdminLabel(preset: OfficialSpomovePreset) {
  const display = getSpomovePresetDisplayModel(preset);
  return {
    title: display.displayTitle,
    group: display.programLabel,
    meta: display.supportMeta || display.axisLabel,
    searchText: [
      display.displayTitle,
      display.programLabel,
      display.supportMeta,
      preset.title,
      preset.programTitle,
      preset.axisTitle,
      preset.id,
    ].filter(Boolean).join(' ').toLowerCase(),
  };
}

function SlotSpomoveCombobox({
  familyId,
  selectedId,
  selectedElsewhere,
  disabled,
  onSelect,
}: {
  familyId: SpomoveCatalogFamilyId;
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
  const optionsPool = useMemo(() => familyPresets(familyId), [familyId]);

  const selected = optionsPool.find((preset) => preset.id === selectedId) ?? null;
  const selectedDisplay = selected ? buildPresetAdminLabel(selected) : null;
  const inputValue = open ? query : selectedDisplay?.title ?? '';

  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return optionsPool.filter((preset) => {
      if (selectedElsewhere.has(preset.id) && preset.id !== selectedId) return false;
      if (!normalized) return true;
      return buildPresetAdminLabel(preset).searchText.includes(normalized);
    }).sort((a, b) => {
      const aLabel = buildPresetAdminLabel(a);
      const bLabel = buildPresetAdminLabel(b);
      const groupCompare = koreanTitleCollator.compare(aLabel.group, bLabel.group);
      const titleCompare = koreanTitleCollator.compare(aLabel.title, bLabel.title);
      const metaCompare = koreanTitleCollator.compare(aLabel.meta, bLabel.meta);
      return groupCompare || titleCompare || metaCompare || a.id.localeCompare(b.id);
    });
  }, [optionsPool, query, selectedElsewhere, selectedId]);

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
            비우기 (카탈로그 앞 순서)
          </li>
          {options.map((preset, index) => {
            const label = buildPresetAdminLabel(preset);
            return (
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
                <p className="text-[13px] font-black text-slate-900">{label.title}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  {label.group}{label.meta ? ` · ${label.meta}` : ''}
                </p>
              </li>
            );
          })}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-[12px] font-semibold text-slate-400">검색 결과 없음</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function SpomoveHubFamilyFeaturedManager() {
  const [families, setFamilies] = useState<SpomoveHubFamilyFeaturedSlots>(emptyHubFamilyFeaturedSlots);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [savingSlots, setSavingSlots] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSlots = async () => {
      try {
        const res = await fetch('/api/admin/spokedu-master/spomove/hub-family-featured', {
          cache: 'no-store',
        });
        const json = await readAdminJsonSafe<{
          families?: SpomoveHubFamilyFeaturedSlots;
          error?: string;
        }>(res, '테마 대표 슬롯을 불러오지 못했습니다');
        if (!res.ok) throw new Error(json.error ?? '테마 대표 슬롯을 불러오지 못했습니다.');
        if (active) {
          setFamilies({
            ...emptyHubFamilyFeaturedSlots(),
            ...json.families,
          });
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : '테마 대표 슬롯을 불러오지 못했습니다.',
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

  const updateSlot = (familyId: SpomoveCatalogFamilyId, index: number, presetId: string | null) => {
    setFamilies((current) => {
      const row = current[familyId] ?? emptyHubFamilyFeaturedSlots()[familyId];
      if (
        presetId != null &&
        row.some((id, slotIndex) => slotIndex !== index && id === presetId)
      ) {
        toast.error('같은 SPOMOVE를 한 테마의 여러 대표 칸에 선택할 수 없습니다.');
        return current;
      }
      return {
        ...current,
        [familyId]: row.map((id, slotIndex) => (slotIndex === index ? presetId : id)),
      };
    });
  };

  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      const res = await fetch('/api/admin/spokedu-master/spomove/hub-family-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ families }),
      });
      const json = await readAdminJsonSafe<{
        families?: SpomoveHubFamilyFeaturedSlots;
        message?: string;
        error?: string;
      }>(res, '테마 대표 슬롯 저장에 실패했습니다');
      if (!res.ok) throw new Error(json.error ?? '테마 대표 슬롯 저장에 실패했습니다.');
      setFamilies({
        ...emptyHubFamilyFeaturedSlots(),
        ...json.families,
      });
      toast.success(json.message ?? '허브 테마 대표 슬롯을 저장했습니다.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '테마 대표 슬롯 저장에 실패했습니다.',
      );
    } finally {
      setSavingSlots(false);
    }
  };

  const selectedPreset = (presetId: string | null): OfficialSpomovePreset | null =>
    presetId ? (OFFICIAL_SPOMOVE_LIBRARY.find((preset) => preset.id === presetId) ?? null) : null;

  return (
    <section className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="mx-auto max-w-[1500px] rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-indigo-600">
              Hub SPOMOVE
            </p>
            <h2 className="mt-1 text-[17px] font-black text-slate-950">
              허브 테마 대표 관리
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500">
              SPOMOVE 허브 전체 화면에서 테마마다 보이는 대표 4칸입니다. 이름·축·ID로 검색해
              고르세요. 빈 칸은 공식 카탈로그 앞 순서로 채워지며, 전체 목록 순서는 바뀌지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSlots()}
            disabled={loadingSlots || savingSlots}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-[12px] font-black text-white disabled:opacity-50"
          >
            <Save size={14} />
            {savingSlots ? '대표 저장 중' : '테마 대표 저장'}
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {SPOMOVE_CATALOG_FAMILIES.map((family) => {
            const slots = families[family.id] ?? Array.from(
              { length: SPOMOVE_HUB_FAMILY_FEATURED_SLOT_COUNT },
              () => null,
            );
            return (
              <div key={family.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3">
                  <h3 className="text-[14px] font-black text-slate-950">{family.name}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{family.description}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {slots.map((selectedId, index) => {
                    const selectedElsewhere = new Set(
                      slots.filter((id, slotIndex): id is string => slotIndex !== index && id != null),
                    );
                    const preset = selectedPreset(selectedId);
                    const label = preset ? buildPresetAdminLabel(preset) : null;

                    return (
                      <div key={`${family.id}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-black text-slate-900">
                            {index + 1}번 대표
                          </p>
                          {selectedId != null ? (
                            <button
                              type="button"
                              onClick={() => updateSlot(family.id, index, null)}
                              className="text-[11px] font-black text-slate-400 hover:text-rose-600"
                            >
                              비우기
                            </button>
                          ) : null}
                        </div>
                        <SlotSpomoveCombobox
                          familyId={family.id}
                          selectedId={selectedId}
                          selectedElsewhere={selectedElsewhere}
                          disabled={loadingSlots}
                          onSelect={(presetId) => updateSlot(family.id, index, presetId)}
                        />
                        {preset ? (
                          <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                            {label?.group}{label?.meta ? ` · ${label.meta}` : ''} · {preset.id}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] font-bold text-slate-400">비어 있음</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
