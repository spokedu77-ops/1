'use client';

import { toast } from 'sonner';

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
import {
  Instagram, AlertCircle,
  Sparkles, X, Calendar, MoreHorizontal,
  CheckSquare, Box, ListOrdered, Play, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useOverlayHistoryDismiss } from '@/app/hooks/useOverlayHistoryDismiss';

type MainCurriculumTab = 'personal' | 'center';

const MONTHLY_THEMES: { [key: number]: { title: string; desc: string } } = {
  3: { title: '새로운 시작과 적응', desc: '친구들과 친해지고 규칙을 익히는 시기입니다.' },
};


export interface CurriculumItem {
  id?: number;
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
  activity_text?: string | null;
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
      .order('id', { ascending: false });
    
    if (error) {
      devLogger.error('Error fetching curriculum:', error);
      return;
    }

    if (data) {
      // DB(snake_case) -> UI(camelCase) 매핑
      const formattedData = data.map((item: { expert_tip?: string; check_list?: string[]; equipment?: string[]; steps?: string[]; [key: string]: unknown }) => ({
        ...item,
        expertTip: item.expert_tip,
        checkList: item.check_list,
        equipment: item.equipment,
        steps: item.steps
      }));
      setItems(formattedData);
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
   return items.filter(item => item.month === selectedMonth && item.week === selectedWeek);
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

 const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

 const parseYuaThemeParts = (steps?: string[]): YuaThemePart[] => {
   if (!steps || steps.length === 0) return [];
   const parts: YuaThemePart[] = [];
   let currentPart: YuaThemePart | null = null;

   for (const raw of steps) {
     const line = raw.trim();
     if (!line) continue;

     const isDetailLine = line.startsWith('-') || line.startsWith(':');
     if (!isDetailLine) {
       currentPart = { title: line, details: [] };
       parts.push(currentPart);
       continue;
     }

     if (!currentPart) {
       currentPart = { title: '세부 내용', details: [] };
       parts.push(currentPart);
     }
     currentPart.details.push(line.replace(/^[-:]\s*/, '').trim());
   }

   return parts.filter((part) => part.title || part.details.length > 0);
 };

 return (
   <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 w-full">
     <style>{`
       @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
       * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; box-sizing: border-box; }
       .no-scrollbar::-webkit-scrollbar { display: none; }
       button, select, [onClick] { cursor: pointer !important; }
     `}</style>

     {/* 헤더: Admin -> Teacher 로 텍스트 변경 */}
     <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 h-16 flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
                <div>
                    <p className="text-[10px] font-bold text-indigo-600 leading-tight">SPOKEDU ARCHIVE</p>
                    <h1 className="text-sm font-black text-slate-900 leading-tight">연간 커리큘럼</h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {/* 뱃지: Teacher */}
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">Teacher</span>
                <MoreHorizontal size={20} className="text-slate-400" />
            </div>
        </div>
     </header>

     <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6 w-full text-left">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {eighthSessionSlots.map(({ label, item }) => {
                      const thumb = item?.url && getYouTubeId(item.url) ? `https://img.youtube.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg` : '';
                      return (
                        <div
                          key={label}
                          role="button"
                          tabIndex={0}
                          className={`group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm transition-all duration-200 ${item ? 'hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer' : 'opacity-60 cursor-default'}`}
                          onClick={() => { if (item) { setSelectedItem(item); setIsDetailModalOpen(true); } }}
                          onKeyDown={(e) => { if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedItem(item); setIsDetailModalOpen(true); } }}
                        >
                          <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-200 flex items-center justify-center">
                                <Play size={28} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wide mb-2">{label}</span>
                            <h3 className="text-base font-black text-slate-900 line-clamp-1">{item?.title ?? label}</h3>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : categoryTab === '유아체육' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {yuaSessionSlots.map(({ label, item }) => {
                      const thumb = item ? getSafeThumbnailUrl(item) : '';
                      return (
                        <div
                          key={label}
                          role="button"
                          tabIndex={0}
                          className={`group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm transition-all duration-200 ${item ? 'hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer' : 'opacity-60 cursor-default'}`}
                          onClick={() => { if (item) { setSelectedItem(item); setIsDetailModalOpen(true); } }}
                          onKeyDown={(e) => { if (item && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedItem(item); setIsDetailModalOpen(true); } }}
                        >
                          <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-200 flex items-center justify-center">
                                <Play size={28} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wide mb-2">{label}</span>
                            <h3 className="text-base font-black text-slate-900 line-clamp-1">{item?.title ?? label}</h3>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : filteredPersonalItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {filteredPersonalItems.map((item) => {
                      const thumb = getSafeThumbnailUrl(item);
                      return (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                          onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedItem(item); setIsDetailModalOpen(true); } }}
                        >
                          <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-200 flex items-center justify-center">
                                <Play size={28} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wide mb-2">{subTab}</span>
                            <h3 className="text-base font-black text-slate-900 line-clamp-1">{item.title ?? subTab}</h3>
                          </div>
                        </div>
                      );
                    })}
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
                    <div className="w-full grid grid-cols-12 gap-1 sm:gap-2">
                      {EQUIPMENT_GUIDE_NUMBERS.map((num) => (
                        <button key={num} type="button" onClick={() => setSelectedEquipmentNumber(num)}
                          className={`min-h-[44px] sm:min-h-[48px] rounded-lg sm:rounded-xl flex items-center justify-center transition-all border font-black text-xs sm:text-sm touch-manipulation
                            ${selectedEquipmentNumber === num ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                        >
                          {num}번
                        </button>
                      ))}
                    </div>
                    {/* 번호-단계 사이: 해당 번호 교구 1개 (읽기 전용) */}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                          {filteredEquipmentItems.map((act) => (
                            <div key={act.id} role="button" tabIndex={0} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer" onClick={() => { setSelectedEquipmentItem(act); setIsEquipmentDetailOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEquipmentItem(act); setIsEquipmentDetailOpen(true); } }}>
                              <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                                {act.activity_image_url ? (
                                  <img src={act.activity_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="p-4 text-center">
                                    <p className="text-sm font-bold text-slate-500 line-clamp-3">{act.activity_text || '활동 내용 없음'}</p>
                                  </div>
                                )}
                              </div>
                              <div className="p-4">
                                <p className="text-sm font-bold text-slate-700 line-clamp-2">{act.activity_text || '활동 내용'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold">
                          {selectedEquipmentNumber}번 · 단계 {selectedEquipmentStep}에 등록된 활동이 없습니다.
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
                  className="w-full flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/80 shadow-sm hover:shadow-md hover:border-indigo-200 active:scale-[0.99] transition-all text-left touch-manipulation"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
                    <Box size={28} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block font-black text-slate-900 text-base sm:text-lg">{CENTER_SECTIONS[0].label}</span>
                    <span className="block text-xs sm:text-sm text-slate-500 font-medium mt-0.5">1~12번 교구 · 단계별 활동 보기</span>
                  </div>
                  <ChevronRight size={22} className="text-slate-300 shrink-0" />
                </button>
                <CurriculumMonthWeekPicker
                  selectedMonth={selectedMonth}
                  selectedWeek={selectedWeek}
                  onMonthChange={setSelectedMonth}
                  onWeekChange={setSelectedWeek}
                  teacherMode
                  currentMonth={currentMonth}
                />

                {/* 배너 */}
                <div className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                  <Sparkles size={120} className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-90 text-[10px] font-bold uppercase">
                      <Calendar size={14} /> {selectedMonth}월 집중 교육 목표
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black mb-2">{currentTheme.title}</h2>
                    <p className="text-indigo-100 font-medium text-sm md:text-base">{currentTheme.desc}</p>
                  </div>
                </div>

                {/* 리스트 (조회 전용) */}
                <div className="w-full">
                  {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className="group bg-white rounded-[28px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer"
                          onClick={() => openDetailModal(item)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailModal(item); } }}
                        >
                          <div className="relative aspect-video bg-slate-100">
                            {!hasUrl(item) ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-bold text-sm">
                                아무것도 없음
                              </div>
                            ) : item.type === 'instagram' ? (
                              <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex flex-col items-center justify-center text-white p-6">
                                <Instagram size={48} className="mb-2 opacity-80" />
                                <span className="text-[10px] font-black tracking-widest uppercase opacity-80">Instagram Reels</span>
                              </div>
                            ) : (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={getSafeThumbnailUrl(item) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} className="w-full h-full object-cover" alt="" />
                              </>
                            )}
                            <div className="absolute top-4 left-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black text-white uppercase ${item.type === 'youtube' ? 'bg-red-600' : 'bg-purple-600'}`}>{item.type}</span>
                            </div>
                            {hasUrl(item) && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play size={20} className="fill-slate-900 text-slate-900 ml-1"/>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-6 space-y-3">
                            <h4 className="text-lg font-black line-clamp-1">{item.title}</h4>
                            <div className="bg-slate-50 p-4 rounded-2xl flex gap-2 items-start">
                              <AlertCircle size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                              <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-3">{item.expertTip}</p>
                            </div>
                          </div>
                        </div>
                      ))}
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
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => dismissTeacherOverlay()} />
            <div className="relative bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {isPersonalItem(selectedItem) && selectedItem.category === '신체 기능향상 8회기' ? (
                  <>
                    <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                      <h2 className="text-xl font-black text-white">{selectedItem.title ?? selectedItem.sub_tab}</h2>
                      <button type="button" onClick={() => dismissTeacherOverlay()} className="p-2 rounded-full hover:bg-white/10 text-slate-400"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-4 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
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
                              <div className="space-y-2">
                                <div className="flex items-center justify-center gap-1.5">
                                  {links.map((_, idx) => (
                                    <span
                                      key={`video-dot-${idx}`}
                                      className={`h-1.5 rounded-full transition-all ${idx === safeIndex ? 'w-5 bg-white' : 'w-1.5 bg-slate-500'}`}
                                    />
                                  ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {links.map((_, idx) => (
                                    <button
                                      key={`video-jump-${idx}`}
                                      type="button"
                                      className={`min-h-[44px] rounded-xl border text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/70 ${idx === safeIndex ? 'bg-indigo-500 text-white border-indigo-300 shadow-md shadow-indigo-500/25' : 'bg-[#383838] text-slate-200 border-slate-600 hover:border-slate-400'}`}
                                      onClick={() => setActiveVideoIndex(idx)}
                                    >
                                      {idx + 1}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="flex-1 min-h-[44px] rounded-xl bg-[#383838] border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 disabled:opacity-40"
                                    onClick={() => setActiveVideoIndex((i) => Math.max(0, i - 1))}
                                    disabled={safeIndex === 0}
                                  >
                                    이전 영상
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 min-h-[44px] rounded-xl bg-[#383838] border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 disabled:opacity-40"
                                    onClick={() => setActiveVideoIndex((i) => Math.min(links.length - 1, i + 1))}
                                    disabled={safeIndex >= links.length - 1}
                                  >
                                    다음 영상
                                  </button>
                                </div>
                              </div>
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
                      <div className="p-6 pb-0 bg-[#2C2C2C] space-y-3">
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
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-1.5">
                              {links.map((_, idx) => (
                                <span
                                  key={`video-dot-${idx}`}
                                  className={`h-1.5 rounded-full transition-all ${idx === safeIndex ? 'w-5 bg-white' : 'w-1.5 bg-slate-500'}`}
                                />
                              ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {links.map((_, idx) => (
                                <button
                                  key={`video-jump-${idx}`}
                                  type="button"
                                  className={`min-h-[44px] rounded-xl border text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/70 ${idx === safeIndex ? 'bg-indigo-500 text-white border-indigo-300 shadow-md shadow-indigo-500/25' : 'bg-[#383838] text-slate-200 border-slate-600 hover:border-slate-400'}`}
                                  onClick={() => setActiveVideoIndex(idx)}
                                >
                                  {idx + 1}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" className="flex-1 min-h-[44px] rounded-xl bg-[#383838] border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 disabled:opacity-40" onClick={() => setActiveVideoIndex((i) => Math.max(0, i - 1))} disabled={safeIndex === 0}>이전 영상</button>
                              <button type="button" className="flex-1 min-h-[44px] rounded-xl bg-[#383838] border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 disabled:opacity-40" onClick={() => setActiveVideoIndex((i) => Math.min(links.length - 1, i + 1))} disabled={safeIndex >= links.length - 1}>다음 영상</button>
                            </div>
                          </div>
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
                <div className="p-8 space-y-8 overflow-y-auto bg-[#2C2C2C] text-white">
                    <div>
                        <h2 className="text-2xl font-black mb-2">{selectedItem.title}</h2>
                        <p className="text-slate-400 text-sm font-bold">
                          {isPersonalItem(selectedItem) ? `${selectedItem.category} · ${selectedItem.sub_tab}` : `${selectedItem.month}월 ${selectedItem.week}주차`} 커리큘럼
                        </p>
                    </div>
                    {isPersonalItem(selectedItem) && selectedItem.category === '유아체육' ? (
                      <>
                        <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left space-y-2">
                          <div className="text-xs font-black text-slate-400 uppercase">테마 제목</div>
                          <p className="text-white font-bold">{selectedItem.title || selectedItem.sub_tab || '—'}</p>
                        </div>
                        {parseYuaThemeParts(selectedItem.steps).length > 0 ? (
                          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                            <div className="text-xs font-black text-slate-400 uppercase mb-3">테마 내용</div>
                            <div className="space-y-3">
                              {parseYuaThemeParts(selectedItem.steps).map((part, i) => (
                                <section key={`${part.title}-${i}`} className="space-y-2 rounded-2xl border border-slate-600/80 bg-[#323232] p-4">
                                  <h4 className="text-sm font-black text-white">{part.title}</h4>
                                  {part.details.length > 0 ? (
                                    <ul className="space-y-2">
                                      {part.details.map((detail, j) => (
                                        <li key={`${detail}-${j}`} className="text-sm font-bold text-slate-200 leading-relaxed">
                                          - {detail}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </section>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
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
       <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
         <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => dismissTeacherOverlay()} />
         <div className="relative bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between items-start">
             <h2 className="text-xl font-black text-slate-900">{selectedEquipmentItem.number}번 · {selectedEquipmentItem.step}단계 활동</h2>
             <button type="button" onClick={() => dismissTeacherOverlay()} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
           </div>
           <div className="p-6 overflow-y-auto space-y-4">
             {selectedEquipmentItem.activity_image_url && (
               <div className="aspect-video rounded-2xl bg-slate-100 overflow-hidden">
                 <img src={selectedEquipmentItem.activity_image_url} alt="" className="w-full h-full object-cover" />
               </div>
             )}
             <div className="text-slate-600 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedEquipmentItem.activity_text || '등록된 활동 내용이 없습니다.'}</div>
           </div>
         </div>
       </div>
     )}
   </div>
 );
}