'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getCurrentWeekOfMonth } from '@/app/lib/curriculum/weekUtils';
import {
  getSubTabsForCategory,
  CENTER_SECTIONS,
  EIGHTH_SESSION_LABELS,
  EQUIPMENT_GUIDE_NUMBERS,
  EQUIPMENT_GUIDE_STEPS,
} from '@/app/lib/curriculum/constants';
import CurriculumCategoryPicker from '@/app/components/curriculum/CurriculumCategoryPicker';
import CurriculumMonthWeekPicker from '@/app/components/curriculum/CurriculumMonthWeekPicker';
import CenterEquipmentActivityDetailModal from '@/app/components/curriculum/CenterEquipmentActivityDetailModal';
import { sortCenterCurriculumByDisplayOrder } from '@/app/lib/curriculum/sortCenterCurriculum';
import { getYouTubeVideoId as getYouTubeId } from '@/app/lib/curriculum/youtubeVideoId';
import {
  Instagram,
  Sparkles, X,
  CheckSquare, Box, ListOrdered, Play, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useOverlayHistoryDismiss } from '@/app/hooks/useOverlayHistoryDismiss';

type MainCurriculumTab = 'personal' | 'center';

const MONTHLY_THEMES: { [key: number]: { title: string; desc: string } } = {
  3: { title: '새로운 시작과 적응', desc: '친구들과 친해지고 규칙을 익히는 시기입니다.' },
};


export interface CurriculumItem {
  id?: number;
  display_order?: number | null;
  is_sub?: boolean;
  equipment_tag_numbers?: number[] | null;
  month?: number;
  week?: number;
  title?: string;
  type?: string;
  url?: string;
  thumbnail?: string | null;
  expertTip?: string;
  checkList?: string[];
  equipment?: string[];
  steps?: string[];
  [key: string]: unknown;
}

interface PersonalCurriculumItem {
  id: number;
  category: string;
  sub_tab: string;
  title?: string;
  url?: string;
  type?: string;
  thumbnail?: string;
  expertTip?: string;
  checkList?: string[];
  equipment?: string[];
  steps?: string[];
  detailText?: string;
  detailText2?: string;
  link2?: string;
  link3?: string;
  link4?: string;
  [key: string]: unknown;
}

/** 교구 가이드라인 전용 */
interface CenterEquipmentItem {
  id: number;
  number: number;
  name: string;
  image_url: string | null;
}

interface CenterEquipmentGuideItem {
  id: number;
  number: number;
  step: number;
  name?: string | null;
  image_url?: string | null;
  detail_text?: string | null;
  activity_image_url?: string | null;
  activity_video_url?: string | null;
  activity_text?: string | null;
}

function displayCurriculumTitle(raw: string | null | undefined, fallback = '') {
  const text = (raw ?? '').trim();
  if (!text) return fallback;
  const matched = text.match(/^(.+?)\s*[（(]([^）)]*[A-Za-z][^）)]*)[）)]\s*$/u);
  return (matched?.[1] ?? text).trim() || fallback;
}

function yuaDetailDepth(line: string) {
  const indent = line.match(/^[\t ]*/)?.[0] ?? '';
  const width = indent.replace(/\t/g, '    ').length;
  return Math.floor(width / 2);
}

function YuaThemeOutline({
  parts,
  lessonTitle,
}: {
  parts: Array<{ title: string; details: string[] }>;
  lessonTitle: string;
}) {
  const sections = parts.filter((part) => part.title.trim() || part.details.length > 0);
  return (
    <ol className="space-y-3 text-left">
      {sections.map((part, index) => {
        const showTitle = part.title.trim() && part.title.trim() !== lessonTitle.trim();
        return (
          <li key={`${part.title}-${index}`} className="rounded-2xl bg-white/[0.04] px-3 py-3">
            {showTitle ? (
              <div className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-indigo-500 text-[12px] font-black tabular-nums text-white">
                  {index + 1}
                </span>
                <h4 className="pt-0.5 text-[15px] font-black leading-snug text-white">{part.title.trim()}</h4>
              </div>
            ) : null}
            {part.details.length > 0 ? (
              <ul className={`space-y-1.5 ${showTitle ? 'mt-2.5 pl-8' : ''}`}>
                {part.details.map((detail, detailIndex) => {
                  const depth = yuaDetailDepth(detail);
                  const text = detail.trim();
                  if (!text) return null;
                  return (
                    <li
                      key={`${index}-${detailIndex}`}
                      className={depth === 0
                        ? 'text-[14px] font-bold leading-relaxed text-slate-100'
                        : 'text-[13px] font-medium leading-relaxed text-slate-300'}
                      style={{ paddingLeft: depth === 0 ? undefined : `${(depth - 1) * 12 + 12}px` }}
                    >
                      {text}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function VideoLinkPager({
  count,
  index,
  onChange,
}: {
  count: number;
  index: number;
  onChange: (next: number) => void;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-bold text-slate-400 disabled:opacity-30"
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={index === 0}
      >
        이전
      </button>
      <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
        {Array.from({ length: count }, (_, idx) => (
          <button
            key={idx}
            type="button"
            className={`h-7 min-w-7 rounded-md px-1.5 text-[12px] font-bold ${idx === index ? 'bg-indigo-500 text-white' : 'bg-[#383838] text-slate-400'}`}
            onClick={() => onChange(idx)}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="h-8 shrink-0 rounded-lg px-2 text-[12px] font-bold text-slate-400 disabled:opacity-30"
        onClick={() => onChange(Math.min(count - 1, index + 1))}
        disabled={index >= count - 1}
      >
        다음
      </button>
    </div>
  );
}

function PersonalSessionCard({
  label,
  title,
  thumb,
  onOpen,
}: {
  label: string;
  title: string;
  thumb: string;
  onOpen: (() => void) | null;
}) {
  return (
    <div
      role="button"
      tabIndex={onOpen ? 0 : -1}
      className={`flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm ${onOpen ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default opacity-60'}`}
      onClick={() => onOpen?.()}
      onKeyDown={(event) => {
        if (!onOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="relative h-16 w-[6.75rem] shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200">
            <Play size={18} className="text-slate-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5 pr-1">
        <span className="text-[11px] font-black tracking-tight text-indigo-600">{label}</span>
        <h3 className="mt-0.5 line-clamp-2 break-keep text-[15px] font-black leading-snug text-slate-950">{title}</h3>
      </div>
    </div>
  );
}

export default function TeacherCurriculumPage() {
 const currentMonth = new Date().getMonth() + 1;
 const [mainTab, setMainTab] = useState<MainCurriculumTab>('personal');
  const [categoryTab, setCategoryTab] = useState<string>('신체 기능향상 8회기');
  const [subTab, setSubTab] = useState<string>(() => getSubTabsForCategory('신체 기능향상 8회기')[0] ?? (EIGHTH_SESSION_LABELS[0] ?? '1-1'));
 const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
 const [selectedMonth, setSelectedMonth] = useState(currentMonth);
 const [selectedWeek, setSelectedWeek] = useState(() => getCurrentWeekOfMonth());
 const [items, setItems] = useState<CurriculumItem[]>([]);
 const [personalItems, setPersonalItems] = useState<PersonalCurriculumItem[]>([]);
 const [personalLoading, setPersonalLoading] = useState(true);
 
 // 상세 모달 상태 (입력 모달은 필요 없음)
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [selectedItem, setSelectedItem] = useState<CurriculumItem | PersonalCurriculumItem | null>(null);
const [activeVideoIndex, setActiveVideoIndex] = useState(0);

 const [centerViewMode, setCenterViewMode] = useState<'center' | 'equipment-guide'>('center');
 const [centerEquipmentList, setCenterEquipmentList] = useState<CenterEquipmentItem[]>([]);
 const [equipmentGuideItems, setEquipmentGuideItems] = useState<CenterEquipmentGuideItem[]>([]);
 const [equipmentGuideLoading, setEquipmentGuideLoading] = useState(false);
 const [selectedEquipmentNumber, setSelectedEquipmentNumber] = useState(1);
 const [selectedEquipmentStep, setSelectedEquipmentStep] = useState(1);
 const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<CenterEquipmentGuideItem | null>(null);
 const [isEquipmentDetailOpen, setIsEquipmentDetailOpen] = useState(false);

 const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));

 // 데이터 불러오기 (Read Only, 쿠키 세션 사용)
 const fetchItems = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('curriculum')
      .select('*')
      .or('is_sub.is.null,is_sub.eq.false')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('id', { ascending: false });
    
    if (error) {
      devLogger.error('Error fetching curriculum:', error);
      return;
    }

    if (data) {
      // DB(snake_case) -> UI(camelCase) 매핑
      const formattedData: CurriculumItem[] = data.map((item: { expert_tip?: string; check_list?: string[]; equipment?: string[]; steps?: string[]; [key: string]: unknown }) => ({
        ...item,
        expertTip: item.expert_tip,
        checkList: item.check_list,
        equipment: item.equipment,
        steps: item.steps
      }));
      setItems(formattedData.filter((item) => item.is_sub !== true));
    }
 }, [supabase]);

 const fetchPersonalItems = useCallback(async () => {
   if (!supabase) return;
   setPersonalLoading(true);
   const { data, error } = await supabase.from('personal_curriculum').select('*').order('id', { ascending: false });
   if (error) {
     devLogger.error('Error fetching personal curriculum:', error);
     setPersonalLoading(false);
     return;
   }
  setPersonalItems((data ?? []).map((row: { expert_tip?: string; check_list?: string[]; equipment?: string[]; steps?: string[]; detail_text?: string; detail_text_2?: string; link_2?: string; link_3?: string; link_4?: string; [key: string]: unknown }) => ({
     ...row,
     expertTip: row.expert_tip,
     checkList: row.check_list,
     equipment: row.equipment,
     steps: row.steps,
     detailText: row.detail_text ?? row.expert_tip,
     detailText2: row.detail_text_2,
     link2: row.link_2,
    link3: row.link_3,
    link4: row.link_4,
   })));
   setPersonalLoading(false);
 }, [supabase]);

 useEffect(() => {
    
   void fetchItems();
 }, [fetchItems]);

 useEffect(() => {
   void fetchPersonalItems();
 }, [fetchPersonalItems]);

 const fetchCenterEquipment = useCallback(async () => {
   if (!supabase) return;
   const { data, error } = await supabase.from('center_equipment').select('*').order('number', { ascending: true });
   if (error) devLogger.error('Error fetching center equipment:', error);
   else setCenterEquipmentList((data ?? []) as CenterEquipmentItem[]);
 }, [supabase]);

 const fetchEquipmentGuide = useCallback(async () => {
   if (!supabase) return;
   setEquipmentGuideLoading(true);
   const { data, error } = await supabase.from('center_equipment_guide').select('*').order('id', { ascending: false });
   if (error) devLogger.error('Error fetching equipment guide:', error);
   else setEquipmentGuideItems((data ?? []) as CenterEquipmentGuideItem[]);
   setEquipmentGuideLoading(false);
 }, [supabase]);

 useEffect(() => {
   if (supabase && mainTab === 'center') {
     void fetchEquipmentGuide();
     void fetchCenterEquipment();
   }
 }, [supabase, mainTab, fetchEquipmentGuide, fetchCenterEquipment]);

 const filteredItems = useMemo(() => {
   const base = items.filter((item) => item.is_sub !== true && item.month === selectedMonth && item.week === selectedWeek);
   return sortCenterCurriculumByDisplayOrder(base);
 }, [items, selectedMonth, selectedWeek]);

 const filteredPersonalItems = useMemo(() => {
   return personalItems.filter(p => p.category === categoryTab && p.sub_tab === subTab);
 }, [personalItems, categoryTab, subTab]);

 const eighthSessionSlots = useMemo(() => {
   return EIGHTH_SESSION_LABELS.map((label) => {
     const item = personalItems.find((p: PersonalCurriculumItem) => p.category === '신체 기능향상 8회기' && p.sub_tab === label) ?? null;
     return { label, item };
   });
 }, [personalItems]);

const yuaSessionSlots = useMemo(() => {
  const labels = getSubTabsForCategory('유아체육');
  return labels.map((label) => {
    const item = personalItems.find((p: PersonalCurriculumItem) => p.category === '유아체육' && p.sub_tab === label) ?? null;
    return { label, item };
  });
}, [personalItems]);

 const filteredEquipmentItems = useMemo(() => {
   return equipmentGuideItems.filter((i) => i.number === selectedEquipmentNumber && i.step === selectedEquipmentStep);
 }, [equipmentGuideItems, selectedEquipmentNumber, selectedEquipmentStep]);

 const currentEquipment = useMemo(() => {
   return centerEquipmentList.find((e) => e.number === selectedEquipmentNumber) ?? null;
 }, [centerEquipmentList, selectedEquipmentNumber]);

 const equipmentGuideChipLabelByNumber = useMemo(() => {
   const map = new Map<number, string>();
   for (const num of EQUIPMENT_GUIDE_NUMBERS) {
     const row = centerEquipmentList.find((e) => e.number === num);
     const trimmed = String(row?.name ?? '').trim();
     map.set(num, trimmed.length > 0 ? trimmed : `${num}번 교구`);
   }
   return map;
 }, [centerEquipmentList]);

 const selectedEquipmentDisplayName =
   equipmentGuideChipLabelByNumber.get(selectedEquipmentNumber) ?? `${selectedEquipmentNumber}번 교구`;

 const closeAllTeacherOverlays = useCallback(() => {
   setCategoryPickerOpen(false);
   setIsDetailModalOpen(false);
   setSelectedItem(null);
   setIsEquipmentDetailOpen(false);
   setSelectedEquipmentItem(null);
 }, []);

 const teacherOverlayActive = categoryPickerOpen || isDetailModalOpen || isEquipmentDetailOpen;

 const dismissTeacherOverlay = useOverlayHistoryDismiss(
   teacherOverlayActive,
   closeAllTeacherOverlays,
   'spokeduCurriculumTeacher'
 );

 const currentTheme = MONTHLY_THEMES[selectedMonth] || { 
   title: `${selectedMonth}월 집중 교육 목표`, 
   desc: '스포키듀와 함께 건강한 에너지를 발산해보세요!' 
 };

 const getSafeThumbnailUrl = (item: { url?: string; thumbnail?: string | null }) => {
    const id = getYouTubeId(item.url ?? '');
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    if (item.thumbnail?.includes('img.youtube.com')) {
      if (item.thumbnail.includes('vi/null')) return '';
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }
    return item.thumbnail ?? '';
 };

 const openDetailModal = (item: CurriculumItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
 };

 const handleMainTabChange = (tab: MainCurriculumTab) => {
   setMainTab(tab);
   if (tab === 'center') {
     setSelectedMonth(currentMonth);
     setSelectedWeek(getCurrentWeekOfMonth());
   }
 };

 const handleCategorySelect = (category: string, sub: string) => {
   setCategoryTab(category);
   setSubTab(sub);
 };

 const isPersonalItem = (item: CurriculumItem | PersonalCurriculumItem): item is PersonalCurriculumItem =>
   'category' in item && 'sub_tab' in item;

const hasUrl = (item: { url?: string }) => {
   const u = item?.url?.trim();
   if (!u || u === '#' || u === 'null' || u === 'undefined' || u.toLowerCase() === 'none') return false;
   return u.startsWith('http://') || u.startsWith('https://');
 };

const hasValidUrlString = (url?: string) => {
  const u = url?.trim();
  if (!u || u === '#' || u === 'null' || u === 'undefined' || u.toLowerCase() === 'none') return false;
  return u.startsWith('http://') || u.startsWith('https://');
};

const getVideoLinks = (item: { url?: string; link2?: string; link3?: string; link4?: string }) =>
  [item.url, item.link2, item.link3, item.link4].filter((u): u is string => hasValidUrlString(u));

useEffect(() => {
  if (!isDetailModalOpen) return;
  setActiveVideoIndex(0);
}, [isDetailModalOpen, selectedItem]);

 type YuaThemePart = {
   title: string;
   details: string[];
 };

 /** 선행 탭·공백은 유지하고, 첫 `-` / `:` 목록 마커와 그 뒤 공백만 제거 */
 const stripYuaDetailBulletMarker = (line: string): string => {
   return line.replace(/^(\s*)[-:]\s*/, (_, indent: string) => indent).replace(/\s+$/, '');
 };

 const parseYuaThemeParts = (steps?: string[]): YuaThemePart[] => {
   if (!steps || steps.length === 0) return [];
   const parts: YuaThemePart[] = [];
   let currentPart: YuaThemePart | null = null;

   for (const raw of steps) {
     if (!raw.trim()) continue;

     const isDetailLine = /^\s*[-:]/.test(raw);
     if (!isDetailLine) {
       currentPart = { title: raw.replace(/\s+$/, ''), details: [] };
       parts.push(currentPart);
       continue;
     }

     if (!currentPart) {
       currentPart = { title: '세부 내용', details: [] };
       parts.push(currentPart);
     }
     currentPart.details.push(stripYuaDetailBulletMarker(raw));
   }

   return parts.filter((part) => part.title || part.details.length > 0);
 };

 return (
   <div className="w-full bg-[#F8FAFC] text-slate-900">
     <style>{`
       @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
       * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; box-sizing: border-box; }
       .no-scrollbar::-webkit-scrollbar { display: none; }
       button, select, [onClick] { cursor: pointer !important; }
     `}</style>

     <main className="mx-auto w-full max-w-4xl px-0 py-3 sm:px-2 sm:py-8">
        <div className="space-y-3 w-full text-left">
            {/* 1단 탭: 개인 수업 / 센터 수업 */}
            <div className="w-full flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                <button
                  type="button"
                  onClick={() => handleMainTabChange('personal')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${mainTab === 'personal' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  개인 수업 커리큘럼
                </button>
                <button
                  type="button"
                  onClick={() => handleMainTabChange('center')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                    ${mainTab === 'center' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  센터 수업 커리큘럼
                </button>
            </div>

            {mainTab === 'personal' ? (
              <>
                <CurriculumCategoryPicker
                  category={categoryTab}
                  subTab={subTab}
                  onSelect={handleCategorySelect}
                  open={categoryPickerOpen}
                  onOpenChange={(open) => {
                    if (open) setCategoryPickerOpen(true);
                    else dismissTeacherOverlay();
                  }}
                />
                {/* 개인 수업 목록 (8회기는 카드 8개, 조회 전용) */}
                {personalLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                  </div>
                ) : categoryTab === '신체 기능향상 8회기' ? (
                  <div className="flex flex-col gap-2">
                    {eighthSessionSlots.map(({ label, item }) => {
                      const thumb = item?.url && getYouTubeId(item.url) ? `https://img.youtube.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg` : '';
                      return (
                        <PersonalSessionCard
                          key={label}
                          label={label}
                          title={displayCurriculumTitle(item?.title, label)}
                          thumb={thumb}
                          onOpen={item ? () => { setSelectedItem(item); setIsDetailModalOpen(true); } : null}
                        />
                      );
                    })}
                  </div>
                ) : categoryTab === '유아체육' ? (
                  <div className="flex flex-col gap-2">
                    {yuaSessionSlots.map(({ label, item }) => (
                      <PersonalSessionCard
                        key={label}
                        label={label}
                        title={displayCurriculumTitle(item?.title, label)}
                        thumb={item ? getSafeThumbnailUrl(item) : ''}
                        onOpen={item ? () => { setSelectedItem(item); setIsDetailModalOpen(true); } : null}
                      />
                    ))}
                  </div>
                ) : filteredPersonalItems.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {filteredPersonalItems.map((item) => (
                      <PersonalSessionCard
                        key={item.id}
                        label={subTab}
                        title={displayCurriculumTitle(item.title, subTab)}
                        thumb={getSafeThumbnailUrl(item)}
                        onOpen={() => { setSelectedItem(item); setIsDetailModalOpen(true); }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold">
                    {categoryTab} · {subTab}에 등록된 커리큘럼이 없습니다.
                  </div>
                )}
              </>
            ) : (
              <>
                {centerViewMode === 'equipment-guide' ? (
                  <>
                    <button type="button" onClick={() => setCenterViewMode('center')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm mb-2">
                      <ArrowLeft size={18} /> 커리큘럼으로
                    </button>
                    <div className="flex w-full gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                      {EQUIPMENT_GUIDE_NUMBERS.map((num) => {
                        const chipLabel = equipmentGuideChipLabelByNumber.get(num) ?? `${num}번 교구`;
                        const selected = selectedEquipmentNumber === num;
                        return (
                        <button key={num} type="button" onClick={() => setSelectedEquipmentNumber(num)}
                          title={`${num}번 · ${chipLabel}`}
                          className={`h-9 shrink-0 whitespace-nowrap rounded-full border px-3 text-[13px] font-bold touch-manipulation
                            ${selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          {chipLabel}
                        </button>
                        );
                      })}
                    </div>
                    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
                      <div className="aspect-square w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {currentEquipment?.image_url ? (
                          <img src={currentEquipment.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Box size={40} className="text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h3 className="font-black text-slate-900 truncate">{currentEquipment?.name || `${selectedEquipmentNumber}번 교구`}</h3>
                      </div>
                    </div>
                    <div className="w-full flex bg-white border border-slate-100 p-1.5 rounded-2xl shadow-sm">
                      {EQUIPMENT_GUIDE_STEPS.map(({ value, label }) => (
                        <button key={value} type="button" onClick={() => setSelectedEquipmentStep(value)}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
                            ${selectedEquipmentStep === value ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="w-full">
                      {equipmentGuideLoading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" /></div>
                      ) : filteredEquipmentItems.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {filteredEquipmentItems.map((act) => {
                            const videoId = act.activity_video_url ? getYouTubeId(act.activity_video_url) : '';
                            const thumb = videoId
                              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                              : (act.activity_image_url || '');
                            return (
                            <div key={act.id} role="button" tabIndex={0} className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-sm" onClick={() => { setSelectedEquipmentItem(act); setIsEquipmentDetailOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEquipmentItem(act); setIsEquipmentDetailOpen(true); } }}>
                              {thumb ? (
                                <div className="mb-3 overflow-hidden rounded-xl bg-slate-100">
                                  <img src={thumb} alt="" className="aspect-video w-full object-cover" />
                                </div>
                              ) : act.activity_video_url ? (
                                <div className="mb-3 flex h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-[13px] font-bold text-slate-500">
                                  <Play size={16} aria-hidden="true" /> 영상
                                </div>
                              ) : null}
                              <p className="whitespace-pre-line break-keep text-[14px] font-semibold leading-relaxed text-slate-800">{act.activity_text || '활동 내용 없음'}</p>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold">
                          {selectedEquipmentDisplayName} · {selectedEquipmentStep}주차에 등록된 활동이 없습니다.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                {/* 센터 고정 섹션: 교구 가이드라인 진입 카드 */}
                <button
                  type="button"
                  onClick={() => setCenterViewMode('equipment-guide')}
                  className="flex h-11 w-full items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-left"
                >
                  <Box size={16} className="shrink-0 text-indigo-600" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-900">{CENTER_SECTIONS[0].label}</span>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </button>
                <CurriculumMonthWeekPicker
                  selectedMonth={selectedMonth}
                  selectedWeek={selectedWeek}
                  onMonthChange={setSelectedMonth}
                  onWeekChange={setSelectedWeek}
                  teacherMode
                  currentMonth={currentMonth}
                />
                <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-500 px-3.5 py-2.5 text-white">
                  <Sparkles size={16} className="shrink-0 text-white/80" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black tracking-tight text-white/75">{selectedMonth}월 집중 교육 목표</p>
                    {currentTheme.title !== `${selectedMonth}월 집중 교육 목표` ? (
                      <>
                        <p className="mt-0.5 break-keep text-[14px] font-black leading-snug">{currentTheme.title}</p>
                        <p className="mt-0.5 break-keep text-[12px] font-semibold leading-snug text-white/80">{currentTheme.desc}</p>
                      </>
                    ) : (
                      <p className="mt-0.5 break-keep text-[14px] font-black leading-snug">{currentTheme.desc}</p>
                    )}
                  </div>
                </div>

                {/* 리스트 (조회 전용) */}
                <div className="w-full">
                  {filteredItems.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {filteredItems.map((item) => {
                        const thumb = item.type === 'instagram' ? '' : getSafeThumbnailUrl(item);
                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 text-left shadow-sm"
                            onClick={() => openDetailModal(item)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(item); } }}
                          >
                            <div className="relative h-16 w-[6.75rem] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                              {thumb ? (
                                <img src={thumb} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-200">
                                  {item.type === 'instagram' ? <Instagram size={18} className="text-slate-400" /> : <Play size={18} className="text-slate-400" />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1 py-0.5 pr-1">
                              <h4 className="line-clamp-2 break-keep text-[15px] font-black leading-snug text-slate-950">{displayCurriculumTitle(item.title)}</h4>
                              <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-500">
                                {item.equipment && item.equipment.length > 0 ? item.equipment.join(' · ') : '등록된 교구 없음'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-black">
                      해당 주차에 등록된 커리큘럼이 없습니다.
                    </div>
                  )}
                </div>
                  </>
                )}
              </>
            )}
        </div>
     </main>

     {/* (+) 버튼 제거됨 */}

     {/* 상세 모달 (읽기 전용, 8회기는 세부내용+링크2개) */}
     {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[320] flex sm:items-center sm:justify-center sm:p-3">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => dismissTeacherOverlay()} />
            <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#1A1A1A] pt-[env(safe-area-inset-top)] sm:h-[calc(100dvh-1.5rem)] sm:max-w-3xl sm:rounded-[28px] sm:pt-0">
                {isPersonalItem(selectedItem) && selectedItem.category === '신체 기능향상 8회기' ? (
                  <>
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-700 px-4 py-4 sm:px-6">
                      <h2 className="text-xl font-black text-white">{displayCurriculumTitle(selectedItem.title, selectedItem.sub_tab ?? '')}</h2>
                      <button type="button" onClick={() => dismissTeacherOverlay()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10"><X size={20}/></button>
                    </div>
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#2C2C2C] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white no-scrollbar sm:p-6">
                      {(() => {
                        const links = getVideoLinks(selectedItem);
                        if (links.length === 0) return null;
                        const safeIndex = Math.min(activeVideoIndex, links.length - 1);
                        const currentUrl = links[safeIndex];
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-400 uppercase">영상 {safeIndex + 1}</span>
                              <span className="text-xs font-bold text-slate-500">{safeIndex + 1} / {links.length}</span>
                            </div>
                            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-600">
                              {getYouTubeId(currentUrl) ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${getYouTubeId(currentUrl)}?autoplay=1`}
                                  className="w-full h-full"
                                  allow="autoplay; encrypted-media"
                                  allowFullScreen
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                                  <Instagram size={40} />
                                  <a
                                    href={currentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm"
                                  >
                                    링크에서 영상 보기
                                  </a>
                                </div>
                              )}
                            </div>
                            {links.length > 1 ? (
                              <VideoLinkPager count={links.length} index={safeIndex} onChange={setActiveVideoIndex} />
                            ) : null}
                          </div>
                        );
                      })()}

                      <div className="bg-[#383838] p-5 rounded-2xl border border-slate-600 text-left">
                        <p className="text-slate-200 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedItem.detailText || '등록된 내용이 없습니다.'}</p>
                      </div>
                      {selectedItem.detailText2?.trim() ? (
                        <div className="bg-[#383838] p-5 rounded-2xl border border-slate-600 text-left">
                          <p className="text-slate-200 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedItem.detailText2}</p>
                        </div>
                      ) : null}
                      {!hasValidUrlString(selectedItem.url) && !hasValidUrlString(selectedItem.link2) && !hasValidUrlString(selectedItem.link3) && !hasValidUrlString(selectedItem.link4) ? (
                        <p className="text-slate-500 text-sm">등록된 영상 링크가 없습니다.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                {isPersonalItem(selectedItem) ? (
                  (() => {
                    const links = getVideoLinks(selectedItem);
                    if (links.length === 0) return null;
                    const safeIndex = Math.min(activeVideoIndex, links.length - 1);
                    const currentUrl = links[safeIndex];
                    return (
                      <div className="shrink-0 space-y-3 bg-[#2C2C2C] p-4 pb-0 sm:p-6">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-400 uppercase">영상 {safeIndex + 1}</span>
                          <span className="text-xs font-bold text-slate-500">{safeIndex + 1} / {links.length}</span>
                        </div>
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-600">
                          {(selectedItem.type === 'youtube' || getYouTubeId(currentUrl)) && getYouTubeId(currentUrl) ? (
                            <iframe
                              src={`https://www.youtube.com/embed/${getYouTubeId(currentUrl)}?autoplay=1`}
                              className="w-full h-full"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                              <Instagram size={48} />
                              <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-black px-6 py-3 rounded-full font-bold">링크에서 영상 보기</a>
                            </div>
                          )}
                        </div>
                        {links.length > 1 ? (
                          <VideoLinkPager count={links.length} index={safeIndex} onChange={setActiveVideoIndex} />
                        ) : null}
                      </div>
                    );
                  })()
                ) : hasUrl(selectedItem) ? (
                  <div className="relative w-full aspect-video bg-black">
                    {selectedItem.type === 'youtube' && getYouTubeId(selectedItem.url ?? '') ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.url ?? '')}?autoplay=1`}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white">
                        <Instagram size={64} className="mb-4" />
                        <a href={selectedItem.url ?? '#'} target="_blank" rel="noopener noreferrer" className="bg-white text-black px-6 py-3 rounded-full font-bold">인스타그램에서 보기</a>
                      </div>
                    )}
                  </div>
                ) : null}
                <button type="button" onClick={() => dismissTeacherOverlay()} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all">
                  <X size={20} />
                </button>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#2C2C2C] p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white sm:p-6">
                    <div>
                        <h2 className="text-lg font-black leading-snug">{displayCurriculumTitle(selectedItem.title)}</h2>
                        <p className="mt-1 text-[12px] font-bold text-slate-400">
                          {isPersonalItem(selectedItem) ? `${selectedItem.category} · ${selectedItem.sub_tab}` : `${selectedItem.month}월 ${selectedItem.week}주차`}
                        </p>
                    </div>
                    {isPersonalItem(selectedItem) && selectedItem.category === '유아체육' && parseYuaThemeParts(selectedItem.steps).length > 0 ? (
                      <YuaThemeOutline
                        parts={parseYuaThemeParts(selectedItem.steps)}
                        lessonTitle={displayCurriculumTitle(selectedItem.title)}
                      />
                    ) : null}
                    {!isPersonalItem(selectedItem) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
                              <div className="flex items-center gap-2 mb-4 text-green-400 font-black text-sm uppercase">
                                  <CheckSquare size={16} /> 사전 체크리스트
                              </div>
                              <ul className="space-y-3">
                                  {selectedItem.checkList && selectedItem.checkList.length > 0 ? selectedItem.checkList.map((check: string, i: number) => (
                                      <li key={i} className="flex gap-3 items-start text-sm font-bold text-slate-200">
                                          <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-500 accent-green-500 bg-transparent" readOnly checked />
                                          <span className="leading-relaxed">{check}</span>
                                      </li>
                                  )) : <li className="text-slate-500 text-sm">등록된 체크리스트가 없습니다.</li>}
                              </ul>
                          </div>
                          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
                              <div className="flex items-center gap-2 mb-4 text-orange-400 font-black text-sm uppercase">
                                  <Box size={16} /> 필요 교구 List
                              </div>
                              <ul className="space-y-3">
                                  {selectedItem.equipment && selectedItem.equipment.length > 0 ? selectedItem.equipment.map((eq: string, i: number) => (
                                      <li key={i} className="flex gap-3 items-start text-sm font-bold text-slate-200">
                                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                                          <span className="leading-relaxed">{eq}</span>
                                      </li>
                                  )) : <li className="text-slate-500 text-sm">등록된 교구가 없습니다.</li>}
                              </ul>
                          </div>
                      </div>
                    )}
                    {!(isPersonalItem(selectedItem) && selectedItem.category === '유아체육') ? (
                      <>
                        <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600">
                            <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
                                <ListOrdered size={16} /> 활동 방법
                            </div>
                            <ol className="space-y-4">
                                 {selectedItem.steps && selectedItem.steps.length > 0 ? selectedItem.steps.map((step: string, i: number) => (
                                    <li key={i} className="flex gap-4 items-start">
                                        <span className="w-6 h-6 bg-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                                          {i+1}
                                        </span>
                                        <p className="text-sm font-bold text-slate-200 leading-relaxed">{step}</p>
                                    </li>
                                 )) : <li className="text-slate-500 text-sm">등록된 활동 방법이 없습니다.</li>}
                            </ol>
                        </div>
                        <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 text-left">
                            <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase">
                                <Sparkles size={14} /> Expert Tip
                            </div>
                            <p className="text-indigo-100 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedItem.expertTip || "등록된 팁이 없습니다."}
                            </p>
                        </div>
                      </>
                    ) : null}
                </div>
                  </>
                )}
            </div>
        </div>
     )}

     {isEquipmentDetailOpen && selectedEquipmentItem && (
       <CenterEquipmentActivityDetailModal
         item={selectedEquipmentItem}
         equipmentDisplayName={selectedEquipmentDisplayName}
         onClose={() => dismissTeacherOverlay()}
       />
     )}
   </div>
 );
}
