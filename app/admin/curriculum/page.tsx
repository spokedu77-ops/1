'use client';

import { toast } from 'sonner';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useOverlayHistoryDismiss, popOverlayHistoryIfPresent } from '@/app/hooks/useOverlayHistoryDismiss';

const CURRICULUM_ADMIN_HISTORY_KEY = 'spokeduCurriculumAdmin';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { getCurrentWeekOfMonth } from '@/app/lib/curriculum/weekUtils';
import {
  PERSONAL_CATEGORIES_ROW1,
  PERSONAL_CATEGORIES_ROW2,
  getSubTabsForCategory,
  CENTER_SECTIONS,
  EIGHTH_SESSION_LABELS,
  EQUIPMENT_GUIDE_NUMBERS,
  EQUIPMENT_GUIDE_STEPS,
} from '@/app/lib/curriculum/constants';
import CurriculumCategoryPicker from '@/app/components/curriculum/CurriculumCategoryPicker';
import CurriculumMonthWeekPicker from '@/app/components/curriculum/CurriculumMonthWeekPicker';
import {
  Instagram, Plus, Sparkles, X, Calendar, MoreHorizontal, Edit2, Trash2,
  CheckSquare, Box, ListOrdered, Play, AlertCircle, ArrowLeft, ChevronRight
} from 'lucide-react';

export type MainCurriculumTab = 'personal' | 'center';

const MONTHLY_THEMES: { [key: number]: { title: string; desc: string } } = {
  3: { title: '새로운 시작과 적응', desc: '친구들과 친해지고 규칙을 익히는 시기입니다.' },
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKS = [1, 2, 3, 4];

interface CurriculumItem {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  month?: number;
  week?: number;
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
  [key: string]: unknown;
}

/** 번호별 고정 교구 12개 (이름 + 이미지) */
interface CenterEquipmentItem {
  id: number;
  number: number;
  name: string;
  image_url: string | null;
}

/** 단계별 활동 (활동 이미지 또는 활동 내용) */
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

/** Supabase 등 객체 에러의 message를 추출해 [object Object] 대신 읽을 수 있는 문자열 반환 */
function formatSaveError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err != null && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  if (err != null && typeof err === 'object') return JSON.stringify(err);
  return String(err);
}

export default function AdminCurriculumPage() {
  const currentMonth = new Date().getMonth() + 1;
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [mainTab, setMainTab] = useState<MainCurriculumTab>('personal');
  const [categoryTab, setCategoryTab] = useState<string>('신체 기능향상 8회기');
  const [subTab, setSubTab] = useState<string>(() => {
    const tabs = getSubTabsForCategory('신체 기능향상 8회기');
    return tabs[0] ?? '';
  });
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState(() => getCurrentWeekOfMonth());
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [personalItems, setPersonalItems] = useState<PersonalCurriculumItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [personalLoading, setPersonalLoading] = useState(true);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CurriculumItem | PersonalCurriculumItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [personalEditingId, setPersonalEditingId] = useState<number | null>(null);
  
  const [newPost, setNewPost] = useState({ 
    title: '', url: '', month: currentMonth, week: getCurrentWeekOfMonth(), 
    expertTip: '', checkListText: '', equipmentText: '', stepsText: '' 
  });
  const [personalPost, setPersonalPost] = useState({
    category: '신체 기능향상 8회기',
    sub_tab: '1-1',
    title: '', url: '', expertTip: '', checkListText: '', equipmentText: '', stepsText: '',
  });
  const [is8huiModalOpen, setIs8huiModalOpen] = useState(false);
  const [is8huiSlotPickerOpen, setIs8huiSlotPickerOpen] = useState(false);
  const [editing8huiSubTab, setEditing8huiSubTab] = useState<string | null>(null);
  const [editing8huiId, setEditing8huiId] = useState<number | null>(null);
  const [eightHuiForm, setEightHuiForm] = useState({ title: '', detailText: '', url: '' });

  const [centerViewMode, setCenterViewMode] = useState<'center' | 'equipment-guide'>('center');
  const [centerEquipmentList, setCenterEquipmentList] = useState<CenterEquipmentItem[]>([]);
  const [equipmentGuideItems, setEquipmentGuideItems] = useState<CenterEquipmentGuideItem[]>([]);
  const [equipmentGuideLoading, setEquipmentGuideLoading] = useState(false);
  const [selectedEquipmentNumber, setSelectedEquipmentNumber] = useState(1);
  const [selectedEquipmentStep, setSelectedEquipmentStep] = useState(1);
  const [isEquipmentDetailOpen, setIsEquipmentDetailOpen] = useState(false);
  const [selectedEquipmentItem, setSelectedEquipmentItem] = useState<CenterEquipmentGuideItem | null>(null);
  const [isEquipmentEditOpen, setIsEquipmentEditOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<number | null>(null);
  const [equipmentForm, setEquipmentForm] = useState({ number: 1, step: 1, activity_image_url: '', activity_text: '' });
  const [isEquipmentMasterEditOpen, setIsEquipmentMasterEditOpen] = useState(false);
  const [equipmentMasterForm, setEquipmentMasterForm] = useState({ name: '', image_url: '' });

  const fetchItems = async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('curriculum')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      devLogger.error('Error fetching curriculum:', error);
    } else if (data) {
      const formattedData = data.map((item: { expert_tip?: unknown; check_list?: unknown; equipment?: unknown; steps?: unknown; [key: string]: unknown }) => ({
        ...item,
        expertTip: item.expert_tip,
        checkList: item.check_list,
        equipment: item.equipment,
        steps: item.steps
      }));
      setItems(formattedData);
    }
    setIsLoading(false);
  };

  const fetchPersonalItems = async () => {
    if (!supabase) {
      setPersonalLoading(false);
      return;
    }
    setPersonalLoading(true);
    const { data, error } = await supabase
      .from('personal_curriculum')
      .select('*')
      .order('id', { ascending: false });
    if (error) {
      devLogger.error('Error fetching personal curriculum:', error);
    } else if (data) {
      setPersonalItems(data.map((row: { expert_tip?: unknown; check_list?: unknown; equipment?: unknown; steps?: unknown; detail_text?: string; detail_text_2?: string; link_2?: string; [key: string]: unknown }) => ({
        ...row,
        expertTip: row.expert_tip,
        checkList: row.check_list,
        equipment: row.equipment,
        steps: row.steps,
        detailText: row.detail_text ?? row.expert_tip,
        detailText2: row.detail_text_2,
        link2: row.link_2,
      })));
    }
    setPersonalLoading(false);
  };

  const fetchCenterEquipment = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('center_equipment').select('*').order('number', { ascending: true });
    if (error) {
      const err = error as { message?: string; hint?: string };
      devLogger.error('Error fetching center equipment:', err.message ?? err.hint ?? JSON.stringify(error));
    } else {
      setCenterEquipmentList((data ?? []) as CenterEquipmentItem[]);
    }
  };

  const fetchEquipmentGuide = async () => {
    if (!supabase) return;
    setEquipmentGuideLoading(true);
    const { data, error } = await supabase.from('center_equipment_guide').select('*').order('id', { ascending: false });
    if (error) devLogger.error('Error fetching equipment guide:', error);
    else setEquipmentGuideItems((data ?? []) as CenterEquipmentGuideItem[]);
    setEquipmentGuideLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when supabase ready; fetchItems stable
  }, [supabase]);

  useEffect(() => {
    if (supabase && mainTab === 'center') {
      void fetchCenterEquipment();
      void fetchEquipmentGuide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when center tab active
  }, [supabase, mainTab]);

  useEffect(() => {
    fetchPersonalItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when supabase ready
  }, [supabase]);

  // 8회기(기존 1회기~8회기 + 링크2개) -> 16개(1-1~8-2) 자동 생성 (기존 데이터는 보존)
  useEffect(() => {
    const migrate8huiToRoutine16 = async () => {
      if (!supabase) return;
      try {
        const { data: existing16, error: e16 } = await supabase
          .from('personal_curriculum')
          .select('id, sub_tab')
          .eq('category', '신체 기능향상 8회기')
          .in('sub_tab', EIGHTH_SESSION_LABELS as unknown as string[]);
        if (e16) throw e16;
        if ((existing16 ?? []).length >= 16) return;

        const legacyLabels = ['1회기', '2회기', '3회기', '4회기', '5회기', '6회기', '7회기', '8회기'];
        const { data: legacy, error: eLegacy } = await supabase
          .from('personal_curriculum')
          .select('*')
          .eq('category', '신체 기능향상 8회기')
          .in('sub_tab', legacyLabels);
        if (eLegacy) throw eLegacy;

        const toInsert: Array<Record<string, unknown>> = [];

        for (const legacyRow of legacy ?? []) {
          const legacySub = String((legacyRow as { sub_tab?: unknown }).sub_tab ?? '');
          const sessionNum = legacyLabels.indexOf(legacySub) + 1;
          if (sessionNum <= 0) continue;

          const url1 = String((legacyRow as { url?: unknown }).url ?? '') || null;
          const detail1 = String((legacyRow as { detail_text?: unknown }).detail_text ?? '') || null;

          const url2 = String((legacyRow as { link_2?: unknown }).link_2 ?? '') || null;
          const detail2 = String((legacyRow as { detail_text_2?: unknown }).detail_text_2 ?? '') || null;

          const type1 = (legacyRow as { type?: unknown }).type;
          const typeValue = typeof type1 === 'string' && type1 ? type1 : 'youtube';

          toInsert.push({
            category: '신체 기능향상 8회기',
            sub_tab: `${sessionNum}-1`,
            title: `${sessionNum}-1`,
            url: url1,
            type: typeValue,
            thumbnail: (legacyRow as { thumbnail?: unknown }).thumbnail ?? null,
            expert_tip: detail1 || null,
            check_list: [],
            equipment: [],
            steps: [],
          });
          toInsert.push({
            category: '신체 기능향상 8회기',
            sub_tab: `${sessionNum}-2`,
            title: `${sessionNum}-2`,
            url: url2,
            type: typeValue,
            thumbnail: null,
            expert_tip: detail2 || null,
            check_list: [],
            equipment: [],
            steps: [],
          });
        }

        // legacy가 없더라도 16개는 만들어 두기(빈 항목)
        if (toInsert.length === 0) {
          for (const label of EIGHTH_SESSION_LABELS as unknown as string[]) {
            toInsert.push({
              category: '신체 기능향상 8회기',
              sub_tab: label,
              title: label,
              url: null,
              type: 'youtube',
              thumbnail: null,
              expert_tip: null,
              check_list: [],
              equipment: [],
              steps: [],
            });
          }
        }

        // 이미 존재하는 sub_tab은 제외
        const existingSet = new Set((existing16 ?? []).map((r: { sub_tab?: string }) => r.sub_tab));
        const uniqueInsert = toInsert.filter((r) => !existingSet.has(String(r.sub_tab)));
        if (uniqueInsert.length === 0) return;

        const { error: eIns } = await supabase.from('personal_curriculum').insert(uniqueInsert);
        if (eIns) throw eIns;

        await fetchPersonalItems();
      } catch (err) {
        devLogger.error('8hui migrate failed:', err);
      }
    };
    void migrate8huiToRoutine16();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- migrate once when supabase ready
  }, [supabase]);

  const filteredItems = useMemo(() => {
    return items.filter((item: CurriculumItem) => item.month === selectedMonth && item.week === selectedWeek);
  }, [items, selectedMonth, selectedWeek]);

  const filteredPersonalItems = useMemo(() => {
    return personalItems.filter((p: PersonalCurriculumItem) => p.category === categoryTab && p.sub_tab === subTab);
  }, [personalItems, categoryTab, subTab]);

  /** 신체 기능향상 8회기: 1~8회기 슬롯별 아이템 */
  const eighthSessionSlots = useMemo(() => {
    return EIGHTH_SESSION_LABELS.map((label) => {
      const item = personalItems.find((p: PersonalCurriculumItem) => p.category === '신체 기능향상 8회기' && p.sub_tab === label) ?? null;
      return { label, item };
    });
  }, [personalItems]);

  const currentEquipment = useMemo(() => {
    return centerEquipmentList.find((e) => e.number === selectedEquipmentNumber) ?? null;
  }, [centerEquipmentList, selectedEquipmentNumber]);

  const filteredEquipmentItems = useMemo(() => {
    return equipmentGuideItems.filter((i) => i.number === selectedEquipmentNumber && i.step === selectedEquipmentStep);
  }, [equipmentGuideItems, selectedEquipmentNumber, selectedEquipmentStep]);

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

  const hasValidUrl = (url?: string) => {
    const u = url?.trim();
    if (!u || u === '#' || u === 'null' || u === 'undefined' || u.toLowerCase() === 'none') return false;
    return u.startsWith('http://') || u.startsWith('https://');
  };

  const getSafeThumbnailUrl = (item: { url?: string; thumbnail?: string }) => {
    const id = getYouTubeId(item.url ?? '');
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    if (item.thumbnail?.includes('img.youtube.com')) {
      if (item.thumbnail.includes('vi/null')) return '';
      return item.thumbnail.replace('maxresdefault', 'hqdefault');
    }
    return item.thumbnail ?? '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const videoId = getYouTubeId(newPost.url);
    const isInsta = newPost.url.includes('instagram.com');
    const type = isInsta ? 'instagram' : 'youtube';
    
    const checkList = newPost.checkListText.split('\n').filter((t: string) => t.trim() !== '');
    const equipment = newPost.equipmentText.split('\n').filter((t: string) => t.trim() !== '');
    const steps = newPost.stepsText.split('\n').filter((t: string) => t.trim() !== '');

    const postData = {
      title: newPost.title, 
      url: newPost.url, 
      month: newPost.month, 
      week: newPost.week, 
      expert_tip: newPost.expertTip,
      check_list: checkList, 
      equipment: equipment, 
      steps: steps, 
      type,
      thumbnail: isInsta ? '' : (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '')
    };
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('curriculum')
          .update(postData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('수정되었습니다.');
      } else {
        const { error } = await supabase
          .from('curriculum')
          .insert([postData]);

        if (error) throw error;
        toast.success('등록되었습니다.');
      }
      
      await fetchItems();
      const hadOverlay = !!(window.history.state as Record<string, unknown>)?.[CURRICULUM_ADMIN_HISTORY_KEY];
      if (hadOverlay) {
        popOverlayHistoryIfPresent(CURRICULUM_ADMIN_HISTORY_KEY);
      } else {
        closeInputModal();
      }
    } catch (err: unknown) {
      toast.error('저장 중 오류 발생: ' + formatSaveError(err));
    }
  };

  const deleteItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까? (복구 불가)')) return;
    try {
      // .select()를 추가하여 실제로 삭제된 행이 있는지 확인
      const { data, error } = await supabase
          .from('curriculum')
          .delete()
          .eq('id', id)
          .select();

      if (error) throw error;

      // data 배열이 비어있다면 DB 권한(RLS) 문제로 실제 삭제가 안 된 것임
      if (!data || data.length === 0) {
        toast.error('삭제되지 않았습니다. Supabase의 RLS(Delete) 정책을 확인해주세요.');
        return;
      }

      // 실제 삭제가 확인된 경우에만 UI 업데이트
      setItems(prev => prev.filter((item: CurriculumItem) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('삭제 실패: ' + msg);
    }
  };

  const openEditModal = (item: CurriculumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setNewPost({ 
      title: item.title ?? '', 
      url: item.url ?? '', 
      month: item.month ?? currentMonth, 
      week: item.week ?? 1, 
      expertTip: item.expertTip || '',
      checkListText: item.checkList ? item.checkList.join('\n') : '',
      equipmentText: item.equipment ? item.equipment.join('\n') : '',
      stepsText: item.steps ? item.steps.join('\n') : ''
    });
    setIsInputModalOpen(true);
  };

  const openDetailModal = (item: CurriculumItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const closeInputModal = () => {
    setIsInputModalOpen(false);
    setEditingId(null);
    setNewPost({ title: '', url: '', month: selectedMonth, week: selectedWeek, expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
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

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    // 개인 수업 등록/수정 모달에서는 체크리스트/Equipment을 더 이상 편집하지 않음
    // 저장 시 기존 값을 항상 비워 정책/요구사항에 맞게 제거합니다.
    const checkList: string[] = [];
    const equipment: string[] = [];
    const steps = personalPost.stepsText.split('\n').filter((t: string) => t.trim() !== '');
    const videoId = getYouTubeId(personalPost.url);
    const isInsta = personalPost.url.includes('instagram.com');
    const type = isInsta ? 'instagram' : 'youtube';
    const payload = {
      category: personalPost.category,
      sub_tab: personalPost.sub_tab,
      title: personalPost.title,
      url: personalPost.url,
      type,
      thumbnail: isInsta ? '' : (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ''),
      expert_tip: personalPost.expertTip,
      check_list: checkList,
      equipment,
      steps,
    };
    try {
      if (personalEditingId) {
        const { error } = await supabase.from('personal_curriculum').update(payload).eq('id', personalEditingId);
        if (error) throw error;
        toast.success('수정되었습니다.');
      } else {
        const { error } = await supabase.from('personal_curriculum').insert([payload]);
        if (error) throw error;
        toast.success('등록되었습니다.');
      }
      await fetchPersonalItems();
      const hadOverlay = !!(window.history.state as Record<string, unknown>)?.[CURRICULUM_ADMIN_HISTORY_KEY];
      if (hadOverlay) {
        popOverlayHistoryIfPresent(CURRICULUM_ADMIN_HISTORY_KEY);
      } else {
        setIsPersonalModalOpen(false);
        setPersonalEditingId(null);
        setPersonalPost({ category: categoryTab, sub_tab: subTab, title: '', url: '', expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
      }
    } catch (err: unknown) {
      toast.error('저장 중 오류: ' + formatSaveError(err));
    }
  };

  const openPersonalModal = () => {
    setPersonalPost({ category: categoryTab, sub_tab: subTab, title: '', url: '', expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
    setPersonalEditingId(null);
    setIsPersonalModalOpen(true);
  };

  const openPersonalEdit = (item: PersonalCurriculumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonalEditingId(item.id);
    setPersonalPost({
      category: item.category,
      sub_tab: item.sub_tab,
      title: item.title ?? '',
      url: item.url ?? '',
      expertTip: item.expertTip ?? '',
      checkListText: item.checkList ? item.checkList.join('\n') : '',
      equipmentText: item.equipment ? item.equipment.join('\n') : '',
      stepsText: item.steps ? item.steps.join('\n') : '',
    });
    setIsPersonalModalOpen(true);
  };

  const deletePersonalItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('personal_curriculum').delete().eq('id', id).select();
    if (error) {
      toast.error('삭제 실패: ' + error.message);
      return;
    }
    setPersonalItems((prev) => prev.filter((p) => p.id !== id));
    toast.success('삭제되었습니다.');
  };

  const closePersonalModal = () => {
    setIsPersonalModalOpen(false);
    setPersonalEditingId(null);
    setPersonalPost({ category: categoryTab, sub_tab: subTab, title: '', url: '', expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
  };

  const open8huiEdit = (subTabLabel: string, item: PersonalCurriculumItem | null) => {
    setEditing8huiSubTab(subTabLabel);
    setEditing8huiId(item?.id ?? null);
    setEightHuiForm({
      title: item?.title ?? subTabLabel,
      detailText: item?.detailText ?? '',
      url: item?.url ?? '',
    });
    setIs8huiModalOpen(true);
  };

  const close8huiModal = () => {
    setIs8huiModalOpen(false);
    setEditing8huiSubTab(null);
    setEditing8huiId(null);
    setEightHuiForm({ title: '', detailText: '', url: '' });
  };

  const handle8huiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || editing8huiSubTab == null) return;
    const subTabLabel = editing8huiSubTab;
    const payload = {
      category: '신체 기능향상 8회기',
      sub_tab: subTabLabel,
      title: eightHuiForm.title,
      url: eightHuiForm.url || null,
      type: 'youtube',
      expert_tip: eightHuiForm.detailText || null,
      check_list: [],
      equipment: [],
      steps: [],
    };
    try {
      if (editing8huiId) {
        const { error } = await supabase.from('personal_curriculum').update(payload).eq('id', editing8huiId);
        if (error) throw error;
        toast.success('수정되었습니다.');
      } else {
        const { error } = await supabase.from('personal_curriculum').insert([payload]);
        if (error) throw error;
        toast.success('등록되었습니다.');
      }
      await fetchPersonalItems();
      const hadOverlay = !!(window.history.state as Record<string, unknown>)?.[CURRICULUM_ADMIN_HISTORY_KEY];
      if (hadOverlay) {
        popOverlayHistoryIfPresent(CURRICULUM_ADMIN_HISTORY_KEY);
      } else {
        close8huiModal();
      }
    } catch (err: unknown) {
      toast.error('저장 중 오류: ' + formatSaveError(err));
    }
  };

  const openEquipmentMasterEdit = () => {
    const eq = centerEquipmentList.find((e) => e.number === selectedEquipmentNumber);
    setEquipmentMasterForm({ name: eq?.name ?? '', image_url: eq?.image_url ?? '' });
    setIsEquipmentMasterEditOpen(true);
  };

  const closeEquipmentMasterEdit = () => {
    setIsEquipmentMasterEditOpen(false);
    setEquipmentMasterForm({ name: '', image_url: '' });
  };

  const handleEquipmentMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const eq = centerEquipmentList.find((e) => e.number === selectedEquipmentNumber);
    const payload = { name: equipmentMasterForm.name.trim() || '', image_url: equipmentMasterForm.image_url.trim() || null };
    try {
      if (eq) {
        const { error } = await supabase.from('center_equipment').update(payload).eq('id', eq.id);
        if (error) throw error;
        toast.success('교구 정보가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('center_equipment').insert([{ number: selectedEquipmentNumber, ...payload }]);
        if (error) throw error;
        toast.success('등록되었습니다.');
      }
      await fetchCenterEquipment();
      const hadOverlay = !!(window.history.state as Record<string, unknown>)?.[CURRICULUM_ADMIN_HISTORY_KEY];
      if (hadOverlay) {
        popOverlayHistoryIfPresent(CURRICULUM_ADMIN_HISTORY_KEY);
      } else {
        closeEquipmentMasterEdit();
      }
    } catch (err: unknown) {
      toast.error('저장 중 오류: ' + formatSaveError(err));
    }
  };

  const openEquipmentEdit = (item: CenterEquipmentGuideItem | null) => {
    if (item) {
      setEditingEquipmentId(item.id);
      setEquipmentForm({ number: item.number, step: item.step, activity_image_url: item.activity_image_url ?? '', activity_text: item.activity_text ?? '' });
    } else {
      setEditingEquipmentId(null);
      setEquipmentForm({ number: selectedEquipmentNumber, step: selectedEquipmentStep, activity_image_url: '', activity_text: '' });
    }
    setIsEquipmentEditOpen(true);
  };

  const closeEquipmentEdit = () => {
    setIsEquipmentEditOpen(false);
    setEditingEquipmentId(null);
    setEquipmentForm({ number: 1, step: 1, activity_image_url: '', activity_text: '' });
  };

  const closeAllCurriculumOverlays = useCallback(() => {
    setCategoryPickerOpen(false);
    setIs8huiSlotPickerOpen(false);
    setIsInputModalOpen(false);
    setEditingId(null);
    setNewPost({
      title: '',
      url: '',
      month: selectedMonth,
      week: selectedWeek,
      expertTip: '',
      checkListText: '',
      equipmentText: '',
      stepsText: '',
    });
    setIsPersonalModalOpen(false);
    setPersonalEditingId(null);
    setPersonalPost({
      category: categoryTab,
      sub_tab: subTab,
      title: '',
      url: '',
      expertTip: '',
      checkListText: '',
      equipmentText: '',
      stepsText: '',
    });
    setIsDetailModalOpen(false);
    setSelectedItem(null);
    setIs8huiModalOpen(false);
    setEditing8huiSubTab(null);
    setEditing8huiId(null);
    setEightHuiForm({ title: '', detailText: '', url: '' });
    setIsEquipmentDetailOpen(false);
    setSelectedEquipmentItem(null);
    setIsEquipmentEditOpen(false);
    setEditingEquipmentId(null);
    setEquipmentForm({ number: 1, step: 1, activity_image_url: '', activity_text: '' });
    setIsEquipmentMasterEditOpen(false);
    setEquipmentMasterForm({ name: '', image_url: '' });
  }, [selectedMonth, selectedWeek, categoryTab, subTab]);

  const curriculumOverlayActive =
    categoryPickerOpen ||
    isInputModalOpen ||
    isPersonalModalOpen ||
    isDetailModalOpen ||
    is8huiModalOpen ||
    is8huiSlotPickerOpen ||
    isEquipmentDetailOpen ||
    isEquipmentEditOpen ||
    isEquipmentMasterEditOpen;

  const dismissCurriculumOverlay = useOverlayHistoryDismiss(
    curriculumOverlayActive,
    closeAllCurriculumOverlays,
    'spokeduCurriculumAdmin'
  );

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const eqName = currentEquipment?.name ?? '활동';
    const payload = {
      number: equipmentForm.number,
      step: equipmentForm.step,
      name: eqName,
      image_url: null,
      detail_text: null,
      activity_image_url: equipmentForm.activity_image_url.trim() || null,
      activity_text: equipmentForm.activity_text.trim() || null,
    };
    try {
      if (editingEquipmentId) {
        const { error } = await supabase.from('center_equipment_guide').update(payload).eq('id', editingEquipmentId);
        if (error) throw error;
        toast.success('수정되었습니다.');
      } else {
        const { error } = await supabase.from('center_equipment_guide').insert([payload]);
        if (error) throw error;
        toast.success('등록되었습니다.');
      }
      await fetchEquipmentGuide();
      const hadOverlay = !!(window.history.state as Record<string, unknown>)?.[CURRICULUM_ADMIN_HISTORY_KEY];
      if (hadOverlay) {
        popOverlayHistoryIfPresent(CURRICULUM_ADMIN_HISTORY_KEY);
      } else {
        closeEquipmentEdit();
      }
    } catch (err: unknown) {
      toast.error('저장 중 오류: ' + formatSaveError(err));
    }
  };

  const deleteEquipmentItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase || !confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('center_equipment_guide').delete().eq('id', id);
    if (error) {
      toast.error('삭제 실패: ' + error.message);
      return;
    }
    setEquipmentGuideItems((prev) => prev.filter((i) => i.id !== id));
    toast.success('삭제되었습니다.');
    setIsEquipmentDetailOpen(false);
    setSelectedEquipmentItem(null);
  };

  const isPersonalItem = (item: CurriculumItem | PersonalCurriculumItem): item is PersonalCurriculumItem => {
    return 'category' in item && 'sub_tab' in item;
  };

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
    <div className="min-h-screen bg-[#F8FAFC] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] text-slate-900 w-full">
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        * { font-family: "Pretendard Variable", sans-serif !important; letter-spacing: -0.025em; box-sizing: border-box; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        button, select, [onClick] { cursor: pointer !important; }
      `}</style>
      
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-center pt-[env(safe-area-inset-top,0px)]">
         <div className="max-w-4xl w-full flex items-center justify-between min-w-0">
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">S</div>
                 <div>
                     <p className="text-[10px] font-bold text-indigo-600 leading-tight">SPOKEDU ARCHIVE</p>
                     <h1 className="text-sm font-black text-slate-900 leading-tight">연간 커리큘럼 관리자</h1>
                 </div>
             </div>
             <div className="flex items-center gap-4">
                 <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase">Admin</span>
                 <MoreHorizontal size={20} className="text-slate-400" />
             </div>
         </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
         <div className="space-y-6 w-full text-left min-w-0">
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
                     else dismissCurriculumOverlay();
                   }}
                 />
                 {/* 개인 수업 목록 (8회기는 카드 8개 + 전용 모달) */}
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
                          className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                          onClick={() => { if (item) { setSelectedItem(item); setIsDetailModalOpen(true); } else open8huiEdit(label, null); }}
                        >
                          <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={(e) => { e.stopPropagation(); open8huiEdit(label, item); }} className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-indigo-600 shadow-md"><Edit2 size={16}/></button>
                            {item && (
                              <button type="button" onClick={(e) => deletePersonalItem(item.id, e)} className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-md"><Trash2 size={16}/></button>
                            )}
                          </div>
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
                     {filteredPersonalItems.map((item: PersonalCurriculumItem) => (
                       <div
                         key={item.id}
                         className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                         onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }}
                       >
                         <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button type="button" onClick={(e) => openPersonalEdit(item, e)} className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-indigo-600 shadow-md"><Edit2 size={16}/></button>
                           <button type="button" onClick={(e) => deletePersonalItem(item.id, e)} className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-md"><Trash2 size={16}/></button>
                         </div>
                         <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                           {getSafeThumbnailUrl(item) ? (
                             <img src={getSafeThumbnailUrl(item)} alt="" className="w-full h-full object-cover" />
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
                     ))}
                   </div>
                 ) : (
                   <div className="w-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold">
                     {categoryTab} · {subTab}에 등록된 커리큘럼이 없습니다. 추가 버튼으로 등록하세요.
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
                     {/* 번호-단계 사이: 해당 번호 교구 1개 (이름+이미지, 편집) */}
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
                         <p className="text-xs text-slate-500 mt-0.5">교구 이름 · 이미지를 입력하세요</p>
                       </div>
                       <button type="button" onClick={openEquipmentMasterEdit} className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-indigo-600 transition-all">
                         교구 편집
                       </button>
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
                             <div key={act.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer" onClick={() => { setSelectedEquipmentItem(act); setIsEquipmentDetailOpen(true); }}>
                               <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button type="button" onClick={(e) => { e.stopPropagation(); openEquipmentEdit(act); }} className="p-2 bg-white/95 backdrop-blur rounded-xl shadow-md text-slate-600 hover:text-indigo-600"><Edit2 size={16}/></button>
                                 <button type="button" onClick={(e) => deleteEquipmentItem(act.id, e)} className="p-2 bg-white/95 backdrop-blur rounded-xl shadow-md text-slate-600 hover:text-red-600"><Trash2 size={16}/></button>
                               </div>
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
                 />

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

                 <div className="w-full">
                     {isLoading ? (
                       <div className="flex flex-col items-center justify-center py-24 gap-4">
                         <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                         <p className="text-sm font-bold text-slate-400">커리큘럼 불러오는 중...</p>
                       </div>
                     ) : filteredItems.length > 0 ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {filteredItems.map((item: CurriculumItem) => (
                                 <div key={item.id} className="group bg-white rounded-[28px] border border-slate-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer" onClick={() => openDetailModal(item)}>
                                     <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button type="button" onClick={(e) => openEditModal(item, e)} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-indigo-600 shadow-sm"><Edit2 size={16}/></button>
                                         <button type="button" onClick={(e) => deleteItem(item.id, e)} className="p-2 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-600 shadow-sm"><Trash2 size={16}/></button>
                                     </div>
                                     <div className="relative aspect-video bg-slate-100">
                                         {item.type === 'instagram' ? (
                                             <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex flex-col items-center justify-center text-white p-6">
                                                 <Instagram size={48} className="mb-2 opacity-80" />
                                                 <span className="text-[10px] font-black tracking-widest uppercase opacity-80">Instagram Reels</span>
                                             </div>
                                         ) : (
                                             <img src={getSafeThumbnailUrl(item) || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'} className="w-full h-full object-cover" alt="" />
                                         )}
                                         <div className="absolute top-4 left-4">
                                             <span className={`px-2 py-1 rounded text-[10px] font-black text-white uppercase ${item.type === 'youtube' ? 'bg-red-600' : 'bg-purple-600'}`}>{item.type}</span>
                                         </div>
                                         <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
                                             <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                 <Play size={20} className="fill-slate-900 text-slate-900 ml-1"/>
                                             </div>
                                         </div>
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

      {mainTab === 'center' && (
        <button type="button" className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 shadow-slate-900/40" onClick={() => {
          if (centerViewMode === 'equipment-guide') {
            openEquipmentEdit(null);
          } else {
            setNewPost({ title: '', url: '', month: selectedMonth, week: selectedWeek, expertTip: '', checkListText: '', equipmentText: '', stepsText: '' });
            setIsInputModalOpen(true);
          }
        }}>
          <Plus size={32} />
        </button>
      )}
      {mainTab === 'personal' && (
        <button
          type="button"
          className="fixed bottom-8 right-8 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 shadow-slate-900/40"
          onClick={() => {
            if (categoryTab === '신체 기능향상 8회기') {
              setIs8huiSlotPickerOpen(true);
            } else {
              openPersonalModal();
            }
          }}
        >
          <Plus size={32} />
        </button>
      )}

      {is8huiSlotPickerOpen && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">어떤 회기를 등록/수정할까요?</h3>
              <button type="button" onClick={() => dismissCurriculumOverlay()} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {eighthSessionSlots.map(({ label, item }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    open8huiEdit(label, item);
                    setIs8huiSlotPickerOpen(false);
                  }}
                  className="py-3 px-2 rounded-xl text-sm font-bold border transition-all touch-manipulation bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedItem && (
         <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
             <div className="relative bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                 {isPersonalItem(selectedItem) && selectedItem.category === '신체 기능향상 8회기' ? (
                   <>
                     <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                       <h2 className="text-xl font-black text-white">{selectedItem.title ?? selectedItem.sub_tab}</h2>
                       <button type="button" onClick={() => dismissCurriculumOverlay()} className="p-2 rounded-full hover:bg-white/10 text-slate-400"><X size={20}/></button>
                     </div>
                    <div className="p-6 space-y-4 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
                      {hasValidUrl(selectedItem.url) && (
                        <div className="space-y-2">
                          <span className="text-xs font-black text-slate-400 uppercase">영상 1</span>
                          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-600">
                            {getYouTubeId(selectedItem.url ?? '') ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.url ?? '')}?autoplay=1`}
                                className="w-full h-full"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                                <Instagram size={40} />
                                <a
                                  href={selectedItem.url ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm"
                                >
                                  링크에서 영상 보기
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {hasValidUrl(selectedItem.link2) && (
                        <div className="space-y-2">
                          <span className="text-xs font-black text-slate-400 uppercase">영상 2</span>
                          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-600">
                            {getYouTubeId(selectedItem.link2 ?? '') ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.link2 ?? '')}?autoplay=1`}
                                className="w-full h-full"
                                allow="autoplay; encrypted-media"
                                allowFullScreen
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4">
                                <Instagram size={40} />
                                <a
                                  href={selectedItem.link2 ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm"
                                >
                                  링크에서 영상 보기
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                       <div className="space-y-2">
                         <span className="text-xs font-black text-slate-400 uppercase">제목</span>
                         <p className="text-white font-bold">{selectedItem.title || selectedItem.sub_tab || '—'}</p>
                       </div>
                       <div className="space-y-2">
                         <span className="text-xs font-black text-slate-400 uppercase">세부내용</span>
                         <div className="bg-[#383838] p-5 rounded-2xl border border-slate-600 text-left">
                           <p className="text-slate-200 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedItem.detailText || '등록된 내용이 없습니다.'}</p>
                         </div>
                       </div>
                      {selectedItem.detailText2?.trim() ? (
                        <div className="space-y-2">
                          <span className="text-xs font-black text-slate-400 uppercase">세부내용 2</span>
                          <div className="bg-[#383838] p-5 rounded-2xl border border-slate-600 text-left">
                            <p className="text-slate-200 text-sm font-bold leading-relaxed whitespace-pre-wrap">{selectedItem.detailText2}</p>
                          </div>
                        </div>
                      ) : null}
                      {!hasValidUrl(selectedItem.url) && !hasValidUrl(selectedItem.link2) ? (
                        <p className="text-slate-500 text-sm">등록된 영상 링크가 없습니다.</p>
                      ) : null}
                     </div>
                   </>
                 ) : (
                   <>
                {hasValidUrl(selectedItem.url as string | undefined) && (
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
                        <a
                          href={selectedItem.url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white text-black px-6 py-3 rounded-full font-bold"
                        >
                          인스타그램에서 보기
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => dismissCurriculumOverlay()}
                  className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
                >
                  <X size={20} />
                </button>
                 
                 <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
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
                          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
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
                          <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
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
                        <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                            <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
                                <ListOrdered size={16} /> 활동 방법
                            </div>
                            <ol className="space-y-4 text-left">
                                {selectedItem.steps && selectedItem.steps.length > 0 ? selectedItem.steps.map((step: string, i: number) => (
                                     <li key={i} className="flex gap-4 items-start text-left">
                                         <span className="w-6 h-6 bg-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                                           {i+1}
                                         </span>
                                         <p className="text-sm font-bold text-slate-200 leading-relaxed text-left">{step}</p>
                                     </li>
                                 )) : <li className="text-slate-500 text-sm">등록된 활동 방법이 없습니다.</li>}
                            </ol>
                        </div>

                        <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 text-left">
                            <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase text-left">
                                <Sparkles size={14} /> Expert Tip
                            </div>
                            <p className="text-indigo-100 font-bold text-sm leading-relaxed whitespace-pre-wrap text-left">
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
      
      {isInputModalOpen && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex justify-between items-center text-left">
              <h2 className="text-2xl font-black">{editingId ? '커리큘럼 수정' : '새 커리큘럼 등록'}</h2>
              <X className="text-slate-400 cursor-pointer" onClick={() => dismissCurriculumOverlay()} />
            </div>
            
            <div className="space-y-4 font-bold text-left">
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">Title</label>
                <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="수업 제목" value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Month</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={newPost.month} onChange={e => setNewPost({...newPost, month: Number(e.target.value)})}>
                    {MONTHS.map((m: number) => <option key={m} value={m}>{m}월</option>)}
                  </select>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Week</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={newPost.week} onChange={e => setNewPost({...newPost, week: Number(e.target.value)})}>
                    {WEEKS.map((w: number) => <option key={w} value={w}>{w}주차</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">URL (YouTube / Shorts)</label>
                  <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="유튜브 영상 또는 쇼츠 링크" value={newPost.url} onChange={e => setNewPost({...newPost, url: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Checklist (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="예: 2인 1조 구성&#13;&#10;후프 배치" value={newPost.checkListText} onChange={e => setNewPost({...newPost, checkListText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Equipment (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="예: 후프 2개&#13;&#10;공 1개" value={newPost.equipmentText} onChange={e => setNewPost({...newPost, equipmentText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Activity Steps (엔터로 구분)</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-32 resize-none text-sm" placeholder="1. 준비 자세&#13;&#10;2. 이동 방법&#13;&#10;3. 마무리" value={newPost.stepsText} onChange={e => setNewPost({...newPost, stepsText: e.target.value})} />
              </div>

              <div className="space-y-2 text-left">
                  <label className="text-xs font-black text-slate-400 uppercase text-left">Expert Tip</label>
                  <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none" placeholder="간단한 팁" value={newPost.expertTip} onChange={e => setNewPost({...newPost, expertTip: e.target.value})} />
              </div>
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">{editingId ? '수정 내용 저장' : '등록 완료'}</button>
          </form>
        </div>
      )}

      {isPersonalModalOpen && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <form onSubmit={handlePersonalSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex justify-between items-center text-left">
              <h2 className="text-2xl font-black">{personalEditingId ? '개인 수업 수정' : '개인 수업 등록'}</h2>
              <X className="text-slate-400 cursor-pointer" onClick={() => dismissCurriculumOverlay()} />
            </div>
            <div className="space-y-4 font-bold text-left">
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">카테고리</label>
                <select required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={personalPost.category} onChange={e => { const v = e.target.value; setPersonalPost({ ...personalPost, category: v, sub_tab: getSubTabsForCategory(v)[0] ?? '' }); }}>
                  {[...PERSONAL_CATEGORIES_ROW1, ...PERSONAL_CATEGORIES_ROW2].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">하위 탭</label>
                <select required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={personalPost.sub_tab} onChange={e => setPersonalPost({ ...personalPost, sub_tab: e.target.value })}>
                  {getSubTabsForCategory(personalPost.category).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">Title</label>
                <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="수업 제목" value={personalPost.title} onChange={e => setPersonalPost({ ...personalPost, title: e.target.value })} />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">URL (YouTube / Shorts)</label>
                <input className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="유튜브 영상 또는 쇼츠 링크 (선택)" value={personalPost.url} onChange={e => setPersonalPost({ ...personalPost, url: e.target.value })} />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">Activity Steps (엔터로 구분)</label>
                <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-32 resize-none text-sm" placeholder="1. 준비 2. 이동 3. 마무리" value={personalPost.stepsText} onChange={e => setPersonalPost({ ...personalPost, stepsText: e.target.value })} />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-400 uppercase text-left">Expert Tip</label>
                <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none" placeholder="간단한 팁" value={personalPost.expertTip} onChange={e => setPersonalPost({ ...personalPost, expertTip: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">{personalEditingId ? '수정 저장' : '등록 완료'}</button>
          </form>
        </div>
      )}

      {is8huiModalOpen && editing8huiSubTab != null && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <form onSubmit={handle8huiSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black">{editing8huiId ? '루틴 프로그램 수정' : `${editing8huiSubTab} 등록`}</h2>
              <X className="text-slate-400 cursor-pointer" onClick={() => dismissCurriculumOverlay()} />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">제목</label>
                <input className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="예: 1-1" value={eightHuiForm.title} onChange={e => setEightHuiForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">세부내용</label>
                <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="관련 설명" value={eightHuiForm.detailText} onChange={e => setEightHuiForm(f => ({ ...f, detailText: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">URL (선택)</label>
                <input className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-sm" placeholder="https://..." value={eightHuiForm.url} onChange={e => setEightHuiForm(f => ({ ...f, url: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">저장</button>
          </form>
        </div>
      )}

      {isEquipmentDetailOpen && selectedEquipmentItem && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <h2 className="text-xl font-black text-slate-900">{selectedEquipmentItem.number}번 · {selectedEquipmentItem.step}단계 활동</h2>
              <button type="button" onClick={() => dismissCurriculumOverlay()} className="p-2 rounded-full hover:bg-slate-100 text-slate-400"><X size={20}/></button>
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

      {isEquipmentEditOpen && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <form onSubmit={handleEquipmentSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black">{editingEquipmentId ? '활동 수정' : '활동 등록'}</h2>
              <X className="text-slate-400 cursor-pointer" onClick={() => dismissCurriculumOverlay()} />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">번호 (1~12)</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={equipmentForm.number} onChange={e => setEquipmentForm(f => ({ ...f, number: Number(e.target.value) }))}>
                    {EQUIPMENT_GUIDE_NUMBERS.map((n) => <option key={n} value={n}>{n}번</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase">단계</label>
                  <select className="w-full bg-slate-100 p-4 rounded-2xl outline-none" value={equipmentForm.step} onChange={e => setEquipmentForm(f => ({ ...f, step: Number(e.target.value) }))}>
                    {EQUIPMENT_GUIDE_STEPS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">활동 이미지 URL (선택)</label>
                <input className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-sm" placeholder="https://..." value={equipmentForm.activity_image_url} onChange={e => setEquipmentForm(f => ({ ...f, activity_image_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">활동 내용 (선택)</label>
                <textarea className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm" placeholder="활동 설명 또는 텍스트" value={equipmentForm.activity_text} onChange={e => setEquipmentForm(f => ({ ...f, activity_text: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">저장</button>
          </form>
        </div>
      )}

      {isEquipmentMasterEditOpen && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => dismissCurriculumOverlay()} />
          <form onSubmit={handleEquipmentMasterSubmit} className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black">{selectedEquipmentNumber}번 교구 편집</h2>
              <X className="text-slate-400 cursor-pointer" onClick={() => dismissCurriculumOverlay()} />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">교구 이름</label>
                <input required className="w-full bg-slate-100 p-4 rounded-2xl outline-none" placeholder="교구 이름" value={equipmentMasterForm.name} onChange={e => setEquipmentMasterForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">이미지 URL (선택)</label>
                <input className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-sm" placeholder="https://..." value={equipmentMasterForm.image_url} onChange={e => setEquipmentMasterForm(f => ({ ...f, image_url: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center">저장</button>
          </form>
        </div>
      )}
    </div>
  );
}