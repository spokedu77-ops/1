"use client";

import { toast } from 'sonner';
import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { ClassGroup } from '@/app/admin/classes-shared/types';
import { buildMemoWithExtras } from '@/app/admin/classes-shared/lib/sessionUtils';
import { CreateScheduleFields } from './components/CreateScheduleFields';
import { CreateSessionEditor } from './components/CreateSessionEditor';
import { buildCreateSchedule, daySettings, localDateInput, scheduleValidation, MONDAY_FIRST_DAYS, type CreateSession, type DaySchedule } from './lib/createSchedule';
import {
  cloneTierFeeMap,
  HARD_CODED_TIER_FEES,
  type TierFeeMap,
} from '@/app/lib/teacherTierSchedule';
import { fetchTeacherTierFeeMap } from '@/app/lib/teacherTierFeesStore';
import { fetchTeacherLogCounts } from '@/app/admin/users/fetchTeacherLogCounts';
import { GROUP_ALIAS_RULES } from '../lib/groupAliases';
import ClassBundlePanel from '../components/ClassBundlePanel';
import {
  getCleanClassTitle,
  getBundleTitleKey,
  makeBundleCompositeKey,
  getBundleTitleFromCompositeKey,
} from '../lib/v2BundleResolve';
import { buildGroupPlannedTotals } from '@/app/admin/classes-shared/lib/plannedRoundTotal';
import { SESSION_TYPE_OPTIONS } from '../lib/sessionTypeCategory';
import { resolveDefaultSessionPrice, resolveDefaultAssistSessionPrice } from '../lib/bulkSessionDefaults';
import { fetchAllClassListSessions } from './lib/fetchAllClassListSessions';


type TimeStatus = 'upcoming' | 'ongoing' | 'completed';

type GroupView = ClassGroup & {
  timeStatus: TimeStatus;
  displayTeacherId: string | null;
  displayDateAt: string; // 리스트에 표시할 대표 날짜(보통 다음 수업일)
};

/** 같은 담당 + 정제 수업명(번들 키)인 행을 한 줄로 합쳐 표시 */
function mergeGroupViewsByBundleKey(rows: GroupView[]): GroupView[] {
  const byKey = new Map<string, GroupView[]>();
  for (const g of rows) {
    const k = makeBundleCompositeKey(g.displayTeacherId, g.title);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(g);
  }
  const out: GroupView[] = [];
  for (const [k, list] of byKey) {
    if (list.length === 1) {
      out.push(list[0]!);
      continue;
    }
    const sorted = [...list].sort(
      (a, b) => new Date(a.displayDateAt).getTime() - new Date(b.displayDateAt).getTime()
    );
    const first = sorted[0]!;
    const titleCanon = getBundleTitleFromCompositeKey(k) || getBundleTitleKey(first.title) || first.title;
    const teacherSet = new Set<string>();
    let minFirst = first.firstClassAt;
    let maxLast = first.lastClassAt;
    let minDisp = first.displayDateAt;
    let roundSum = 0;
    let completedSum = 0;
    for (const x of sorted) {
      roundSum += x.roundTotal;
      completedSum += x.completedCount;
      for (const tid of x.teacherIds) {
        if (tid) teacherSet.add(tid);
      }
      if (new Date(x.firstClassAt).getTime() < new Date(minFirst).getTime()) minFirst = x.firstClassAt;
      if (new Date(x.lastClassAt).getTime() > new Date(maxLast).getTime()) maxLast = x.lastClassAt;
      if (new Date(x.displayDateAt).getTime() < new Date(minDisp).getTime()) minDisp = x.displayDateAt;
    }
    const anyOngoing = sorted.some((x) => x.timeStatus === 'ongoing');
    out.push({
      ...first,
      groupId: first.groupId,
      title: titleCanon,
      roundTotal: roundSum,
      completedCount: completedSum,
      firstClassAt: minFirst,
      lastClassAt: maxLast,
      teacherIds: Array.from(teacherSet),
      displayDateAt: minDisp,
      displayTeacherId: first.displayTeacherId,
      timeStatus: anyOngoing ? 'ongoing' : 'upcoming',
    });
  }
  return out.sort((a, b) =>
    getCleanClassTitle(a.title).localeCompare(getCleanClassTitle(b.title), 'ko-KR')
  );
}

type BundleSelection = {
  bundleTitle: string;
  groupIds: string[];
};

type TeacherOption = {
  id: string;
  name: string;
  session_count?: number | null;
  logCount?: number | null;
  fee_private?: number | null;
  fee_group?: number | null;
  fee_center_main?: number | null;
  fee_center_assist?: number | null;
};

function ClassListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusAppliedRef = useRef(false);
  const [supabase] = useState(() =>
    typeof window !== 'undefined' ? getSupabaseBrowserClient() : null
  );
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [teacherMap, setTeacherMap] = useState<Record<string, string>>({});
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFeeMap, setTierFeeMap] = useState<TierFeeMap>(() => cloneTierFeeMap(HARD_CODED_TIER_FEES));
  const [selectedBundle, setSelectedBundle] = useState<BundleSelection | null>(null);
  const [aliasGroupIdsByTitle, setAliasGroupIdsByTitle] = useState<Record<string, string[]>>({});
  const [bundleGroupIdsByKey, setBundleGroupIdsByKey] = useState<Record<string, string[]>>({});

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'regular_private' as (typeof SESSION_TYPE_OPTIONS)[number]['value'],
    teacherId: '',
    startDate: localDateInput(new Date()),
    startTime: '10:00',
    durationMinutes: '60',
    price: 30000,
    weeklyFrequency: 1,
    daysOfWeek: [new Date().getDay()],
    sessionCount: 4,
    roundWeight: 1,
    repeatOnce: false,
  });
  const [editableSessions, setEditableSessions] = useState<CreateSession[]>([]);
  const [dayOverrides, setDayOverrides] = useState<Record<number, DaySchedule>>({});
  const generatedSettingsRef = useRef('');
  const createDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isCreateOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    createDialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(createDialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? []).filter((control) => control.getClientRects().length);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === createDialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isCreateOpen]);
  const createPreview = buildCreateSchedule(createForm, dayOverrides);
  const assistDefault = (id: string) => resolveDefaultAssistSessionPrice(teachers.find((teacher) => teacher.id === id), createForm.type, tierFeeMap);

  const resolveDefaultPrice = useCallback(
    (teacherId: string, clsType: string): number => {
      const selectedTeacher = teachers.find((t) => t.id === teacherId);
      return resolveDefaultSessionPrice(selectedTeacher, clsType, tierFeeMap);
    },
    [teachers, tierFeeMap],
  );

  const fetchGroups = useCallback(async () => {
    if (!supabase) return;
    try {
      const [sessionRows, usersRes] = await Promise.all([
        fetchAllClassListSessions(supabase as never),
        supabase
          .from('users')
          .select('id, name, session_count, fee_private, fee_group, fee_center_main, fee_center_assist')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);

      if (usersRes.data) {
        const map: Record<string, string> = {};
        const base = usersRes.data as TeacherOption[];
        const logCountByTeacher = await fetchTeacherLogCounts(
          supabase,
          base.map((u) => u.id),
        );
        const list = base.map((u) => ({
          ...u,
          logCount: logCountByTeacher[u.id] ?? 0,
        }));
        list.forEach((u) => {
          map[u.id] = u.name ?? '';
        });
        setTeacherMap(map);
        setTeachers(list);
      }
      const { map: nextTierFeeMap } = await fetchTeacherTierFeeMap(supabase);
      setTierFeeMap(nextTierFeeMap);

      const data = sessionRows;
      if (data.length === 0) {
        setGroups([]);
        return;
      }

      const plannedByGroup = buildGroupPlannedTotals(data as any[]);

      // ✅ 사이클 토글용 번들 키: 담당(created_by) + 정제 수업명이 같으면 같은 번들(별도 개설 포함)
      // (리스트에는 완료를 숨기지만, 모달에서는 토글로 볼 수 있어야 함)
      const bundleMap = new Map<string, Set<string>>();
      for (const row of data as any[]) {
        if (!row.group_id) continue;
        const titlePart = getBundleTitleKey(String(row.title || ''));
        if (!titlePart) continue;
        const key = makeBundleCompositeKey(
          row.created_by as string | null | undefined,
          String(row.title || '')
        );
        if (!bundleMap.has(key)) bundleMap.set(key, new Set<string>());
        bundleMap.get(key)!.add(String(row.group_id));
      }
      const nextBundle: Record<string, string[]> = {};
      for (const [k, set] of bundleMap.entries()) nextBundle[k] = Array.from(set);
      setBundleGroupIdsByKey(nextBundle);

      const now = Date.now();
      const byGroup = new Map<
        string,
        {
          g: GroupView;
          minStartMs: number;
          earliestUpcomingStartMs: number;
          earliestUpcomingTeacherId: string | null;
          earliestOngoingStartMs: number;
          ongoingTeacherId: string | null;
          maxEndMs: number;
          earliestUpcomingStartAt: string | null;
          earliestOngoingStartAt: string | null;
        }
      >();

      (data as any[]).forEach((row) => {
        if (!row.group_id) return;
        const key = row.group_id as string;
        const startAt = row.start_at as string;
        const endAt = row.end_at as string;
        const startMs = new Date(startAt).getTime();
        const endMs = new Date(endAt).getTime();
        const teacherId = (row.created_by as string | null) ?? null;
        const isOngoing = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs <= now && now <= endMs;
        const isUpcoming = Number.isFinite(startMs) && startMs > now;

        const existing = byGroup.get(key);
        if (!existing) {
          const roundTotal = plannedByGroup[key] ?? Number(row.round_total) ?? 1;
          const g: GroupView = {
            groupId: key,
            title: row.title || '',
            roundTotal,
            completedCount: 0,
            firstClassAt: startAt,
            lastClassAt: endAt,
            teacherIds: teacherId ? [teacherId] : [],
            timeStatus: 'upcoming',
            displayTeacherId: teacherId,
            displayDateAt: startAt,
          };
          byGroup.set(key, {
            g,
            minStartMs: Number.isFinite(startMs) ? startMs : Number.POSITIVE_INFINITY,
            earliestUpcomingStartMs: isUpcoming ? startMs : Number.POSITIVE_INFINITY,
            earliestUpcomingTeacherId: isUpcoming ? teacherId : null,
            earliestOngoingStartMs: isOngoing ? startMs : Number.POSITIVE_INFINITY,
            ongoingTeacherId: isOngoing ? teacherId : null,
            maxEndMs: Number.isFinite(endMs) ? endMs : Number.NEGATIVE_INFINITY,
            earliestUpcomingStartAt: isUpcoming ? startAt : null,
            earliestOngoingStartAt: isOngoing ? startAt : null,
          });
        } else {
          const g = existing.g;
          g.roundTotal = plannedByGroup[key] ?? g.roundTotal;
          if (startAt < g.firstClassAt) g.firstClassAt = startAt;
          if (endAt > g.lastClassAt) g.lastClassAt = endAt;
          if (teacherId && !g.teacherIds.includes(teacherId)) g.teacherIds.push(teacherId);

          if (Number.isFinite(startMs)) existing.minStartMs = Math.min(existing.minStartMs, startMs);
          if (Number.isFinite(endMs)) existing.maxEndMs = Math.max(existing.maxEndMs, endMs);

          if (isOngoing && startMs < existing.earliestOngoingStartMs) {
            existing.earliestOngoingStartMs = startMs;
            existing.ongoingTeacherId = teacherId;
            existing.earliestOngoingStartAt = startAt;
          }
          if (isUpcoming && startMs < existing.earliestUpcomingStartMs) {
            existing.earliestUpcomingStartMs = startMs;
            existing.earliestUpcomingTeacherId = teacherId;
            existing.earliestUpcomingStartAt = startAt;
          }
        }
      });

      const list: GroupView[] = [];
      for (const {
        g,
        ongoingTeacherId,
        earliestUpcomingTeacherId,
        earliestOngoingStartMs,
        maxEndMs,
        minStartMs,
        earliestUpcomingStartAt,
        earliestOngoingStartAt,
      } of byGroup.values()) {
        const hasOngoing = Number.isFinite(earliestOngoingStartMs) && earliestOngoingStartMs !== Number.POSITIVE_INFINITY;

        // ✅ 시리즈 관점: (1) 아직 시작 전이면 예정, (2) 모두 끝났으면 완료, (3) 그 외는 진행중
        const timeStatus: TimeStatus =
          Number.isFinite(minStartMs) && now < minStartMs
            ? 'upcoming'
            : Number.isFinite(maxEndMs) && now > maxEndMs
              ? 'completed'
              : 'ongoing';
        g.timeStatus = timeStatus;
        g.displayTeacherId = (hasOngoing ? ongoingTeacherId : earliestUpcomingTeacherId) ?? null;
        // ✅ 대표 날짜: 진행중이면 "가장 가까운 진행중(또는 다음 예정)", 예정이면 "다음 예정"
        g.displayDateAt =
          (timeStatus === 'ongoing' ? (earliestOngoingStartAt || earliestUpcomingStartAt) : earliestUpcomingStartAt) ||
          g.firstClassAt;
        if (timeStatus === 'completed') continue; // ✅ 완료(종료) 그룹은 목록에서 숨김
        list.push(g);
      }

      // ✅ 수업명(정제 후) 가나다순
      list.sort((a, b) => getCleanClassTitle(a.title).localeCompare(getCleanClassTitle(b.title), 'ko-KR'));

      // 가상 그룹(별칭): group_id 기반으로만 묶기(오탐 방지)
      const normalizeForAlias = (rawTitle: string) => {
        // (강사명) 같은 괄호 내용은 제거하고, 공백을 정리한 뒤 비교
        return getCleanClassTitle(rawTitle).replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      };

      const getAliasTitleForGroup = (rawTitle: string): string | null => {
        const t = normalizeForAlias(rawTitle);
        for (const rule of GROUP_ALIAS_RULES) {
          const ok = rule.matchAny.some((m) => m.titleIncludesAll.every((needle) => t.includes(needle)));
          if (ok) return rule.aliasTitle;
        }
        return null;
      };

      const mergedByAlias = new Map<
        string,
        { row: GroupView; groupIds: string[] }
      >();
      const passthrough: GroupView[] = [];

      for (const g of list) {
        const alias = getAliasTitleForGroup(g.title);
        if (!alias) {
          passthrough.push(g);
          continue;
        }
        const existing = mergedByAlias.get(alias);
        if (!existing) {
          mergedByAlias.set(alias, { row: { ...g, title: alias }, groupIds: [g.groupId] });
        } else {
          existing.groupIds.push(g.groupId);
          // 대표 날짜는 더 빠른 값
          if (new Date(g.displayDateAt).getTime() < new Date(existing.row.displayDateAt).getTime()) {
            existing.row.displayDateAt = g.displayDateAt;
            existing.row.displayTeacherId = g.displayTeacherId;
            existing.row.timeStatus = g.timeStatus;
          }
          existing.row.roundTotal += g.roundTotal;
        }
      }

      const merged = Array.from(mergedByAlias.values()).map((x) => x.row);
      const combined = [...passthrough, ...merged].sort((a, b) =>
        getCleanClassTitle(a.title).localeCompare(getCleanClassTitle(b.title), 'ko-KR')
      );

      const displayRows = mergeGroupViewsByBundleKey(combined);

      const nextAliasMap: Record<string, string[]> = {};
      for (const [aliasTitle, v] of mergedByAlias.entries()) {
        nextAliasMap[aliasTitle] = v.groupIds;
      }
      setAliasGroupIdsByTitle(nextAliasMap);

      setGroups(displayRows);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message)
            : String(err);
      devLogger.error('[classes list] fetchGroups failed:', msg, err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (focusAppliedRef.current || loading) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const focusGroupId = params.get('focusGroupId');
    if (!focusGroupId) {
      focusAppliedRef.current = true;
      return;
    }
    let handled = false;
    for (const [aliasTitle, ids] of Object.entries(aliasGroupIdsByTitle)) {
      if (ids.includes(focusGroupId)) {
        setSelectedBundle({ bundleTitle: aliasTitle, groupIds: ids });
        handled = true;
        break;
      }
    }
    if (!handled) {
      for (const [key, ids] of Object.entries(bundleGroupIdsByKey)) {
        if (ids.includes(focusGroupId)) {
          setSelectedBundle({
            bundleTitle: getBundleTitleFromCompositeKey(key),
            groupIds: ids,
          });
          handled = true;
          break;
        }
      }
    }
    focusAppliedRef.current = true;
    router.replace('/admin/classes/list', { scroll: false });
  }, [loading, aliasGroupIdsByTitle, bundleGroupIdsByKey, router]);

  const handleCreateChange = (field: string, value: string | number | boolean) => {
    if (field === 'type') {
      setDayOverrides((prev) => Object.fromEntries(Object.entries(prev).map(([day, config]) => [day, {
        ...config,
        price: resolveDefaultPrice(config.teacherId, String(value)),
        assistants: config.assistants.map((teacher) => ({ ...teacher, price: resolveDefaultAssistSessionPrice(teachers.find((candidate) => candidate.id === teacher.id), String(value), tierFeeMap) })),
      }])));
    }
    setCreateForm((prev) => {
      const applyTierDefaultPrice = (next: typeof prev) =>
        next.teacherId
          ? {
              ...next,
              price: resolveDefaultPrice(next.teacherId, next.type),
            }
          : next;

      if (field === 'price') {
        return { ...prev, price: Number(value) || 0 };
      }

      if (field === 'type') {
        const v = String(value);
        const wasSingle =
          prev.type === 'one_day_private' || prev.type === 'one_day_center';
        const nextSingle = v === 'one_day_private' || v === 'one_day_center';
        if (nextSingle) {
          return applyTierDefaultPrice({
            ...prev,
            type: v as typeof prev.type,
            weeklyFrequency: 1,
            sessionCount: 1,
            roundWeight: 1,
            daysOfWeek: [new Date(`${prev.startDate}T${prev.startTime}`).getDay()],
          });
        }
        return applyTierDefaultPrice({
          ...prev,
          type: v as typeof prev.type,
          repeatOnce: false,
          sessionCount: wasSingle ? 4 : prev.sessionCount,
        });
      }
      if (field === 'startDate') {
        const newBaseDay = new Date(`${value}T${prev.startTime}`).getDay();
        const oldBaseDay = new Date(`${prev.startDate}T${prev.startTime}`).getDay();
        const extras = prev.daysOfWeek.filter((d) => d !== oldBaseDay);
        const nextDays = [newBaseDay, ...extras.filter((d) => d !== newBaseDay)].sort(
          (a, b) => a - b
        );
        return { ...prev, startDate: String(value), daysOfWeek: nextDays };
      }
      if (field === 'weeklyFrequency') {
        const baseDay = new Date(`${prev.startDate}T${prev.startTime}`).getDay();
        const extras = prev.daysOfWeek.filter((d) => d !== baseDay);
        const needed = Number(value) - 1;
        const nextDays = [baseDay, ...extras.slice(0, needed)].sort((a, b) => a - b);
        return { ...prev, weeklyFrequency: Number(value), daysOfWeek: nextDays };
      }

      const next = { ...prev, [field]: value } as typeof prev;
      if (field === 'teacherId') {
        return applyTierDefaultPrice(next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setIsCreateOpen(true);
    setCreateStep(1);
    setEditableSessions([]);
    router.replace('/admin/classes/list', { scroll: false });
  }, [router, searchParams]);

  const toggleCreateDay = (dayValue: number) => {
    setCreateForm((prev) => {
      const baseDay = new Date(`${prev.startDate}T00:00:00`).getDay();
      if (dayValue === baseDay) return prev;
      const nextDays = prev.daysOfWeek.includes(dayValue)
        ? prev.daysOfWeek.filter((day) => day !== dayValue)
        : [...prev.daysOfWeek, dayValue].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: nextDays, weeklyFrequency: nextDays.length };
    });
  };

  const applyCreatePreset = (count: number) => {
    setCreateForm((prev) => {
      const baseDay = new Date(`${prev.startDate}T00:00:00`).getDay();
      const singleType = prev.type === 'one_day_private' || prev.type === 'one_day_center';
      const type = count > 0 && singleType ? (prev.type === 'one_day_center' ? 'regular_center' : 'regular_private') : prev.type;
      const offsets = count === 2 ? [0, 3] : count === 3 ? [0, 2, 4] : Array.from({ length: Math.max(count, 1) }, (_, i) => i);
      const daysOfWeek = offsets.map((offset) => (baseDay + offset) % 7).sort((a, b) => a - b);
      return { ...prev, type, repeatOnce: count === 0, daysOfWeek, weeklyFrequency: daysOfWeek.length, sessionCount: count === 0 ? 1 : prev.sessionCount === 1 ? 4 : prev.sessionCount };
    });
  };

  const copyFirstDaySettings = () => {
    const days = MONDAY_FIRST_DAYS.filter((day) => createForm.daysOfWeek.includes(day));
    const first = days[0];
    if (first == null) return;
    const config = daySettings(createForm, dayOverrides, first);
    setDayOverrides((prev) => ({ ...prev, ...Object.fromEntries(days.map((day) => [day, { ...config, assistants: config.assistants.map((teacher) => ({ ...teacher })) }])) }));
  };

  const goToCreateStep2 = () => {
    if (!createForm.title.trim()) return toast.error('수업명을 입력해 주세요.');
    const error = scheduleValidation(createPreview);
    if (error) return toast.error(error);
    const signature = JSON.stringify([createForm, dayOverrides]);
    if (signature !== generatedSettingsRef.current) {
      setEditableSessions(createPreview);
      generatedSettingsRef.current = signature;
    }
    setCreateStep(2);
  };

  const applyFirstRowToAll = () => {
    if (!editableSessions.length) return;
    const first = editableSessions[0];
    const updated = editableSessions.map((s, idx) => {
      if (idx === 0) return s;
      const start = new Date(s.startAt);
      start.setHours(first.startAt.getHours(), first.startAt.getMinutes(), 0, 0);
      const end = new Date(start);
      const diffMinutes = (first.endAt.getTime() - first.startAt.getTime()) / (1000 * 60);
      end.setMinutes(end.getMinutes() + diffMinutes);
      return { ...s, teacherId: first.teacherId, price: first.price, assistants: first.assistants.map((teacher) => ({ ...teacher })), startAt: start, endAt: end };
    });
    setEditableSessions(updated);
  };

  const resetCreate = () => {
    generatedSettingsRef.current = '';
    setDayOverrides({});
    setCreateStep(1);
    setEditableSessions([]);
    setCreateForm({
      title: '',
      type: 'regular_private',
      teacherId: '',
      startDate: localDateInput(new Date()),
      startTime: '10:00',
      durationMinutes: '60',
      price: 30000,
      weeklyFrequency: 1,
      daysOfWeek: [new Date().getDay()],
      sessionCount: 4,
      roundWeight: 1,
      repeatOnce: false,
    });
  };

  const handleCreateSubmit = async () => {
    if (!supabase) return;
    const validationError = scheduleValidation(editableSessions);
    if (validationError) return toast.error(validationError);
    if (!editableSessions.length) return toast.error('회차가 없습니다. 회차를 먼저 생성해주세요.');

    setCreateLoading(true);
    try {
      const commonGroupId = crypto.randomUUID();
      const sorted = [...editableSessions].sort((a, b) => a.roundIndex - b.roundIndex);
      const totalRounds = sorted.length;

      const isSingleSessionType =
        createForm.type === 'one_day_private' || createForm.type === 'one_day_center';
      const sessionType = createForm.type;

      const sessionsToInsert: Record<string, unknown>[] = [];
      sorted.forEach((session, idx) => {
        const roundIndex = idx + 1;
        const roundDisplay = isSingleSessionType
          ? '1/1'
          : `${roundIndex}/${totalRounds}`;

        sessionsToInsert.push({
          title: createForm.title,
          session_type: sessionType,
          start_at: session.startAt.toISOString(),
          end_at: session.endAt.toISOString(),
          status: 'opened',
          group_id: commonGroupId,
          sequence_number: roundIndex,
          round_index: roundIndex,
          round_total: totalRounds,
          round_display: roundDisplay,
          price: Number(session.price) || 0,
          created_by: session.teacherId || createForm.teacherId,
          ...(session.assistants.length ? { memo: buildMemoWithExtras('', session.assistants) } : {}),
        });
      });

      const { error } = await supabase.from('sessions').insert(sessionsToInsert);
      if (error) throw error;

      toast.success('수업이 성공적으로 등록되었습니다!');
      setIsCreateOpen(false);
      resetCreate();
      fetchGroups();
    } catch (err: unknown) {
      devLogger.error(err);
      toast.error('등록 중 에러가 발생했습니다.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <main className="flex-1 min-w-0 px-3 sm:px-6 py-4 sm:py-6 overflow-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">수업 목록</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">
              group_id 기준으로 묶인 수업 시리즈입니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
            >
              새 수업 개설
            </button>
            <Link
              href="/admin/classes/calendar"
              className="inline-flex min-h-[44px] items-center px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              캘린더 보기
            </Link>
          </div>
        </div>

        {isCreateOpen && (
          <div className="fixed inset-0 z-[400]">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsCreateOpen(false)} />
            <div className="absolute inset-0 flex items-end justify-center p-0 md:items-center md:p-4">
              <div ref={createDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="class-create-title" aria-busy={createLoading} className="flex h-[calc(var(--viewport-height-px,100dvh)-0.75rem)] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-100 bg-white shadow-2xl outline-none md:h-auto md:max-h-[calc(var(--viewport-height-px,100dvh)-2rem)] md:rounded-3xl">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                  <div>
                    <h2 id="class-create-title" className="text-lg font-black text-slate-900">수업 개설</h2>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      요일마다 시간과 메인·보조강사를 설정하고, 생성할 일정을 확인하세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      resetCreate();
                    }}
                    disabled={createLoading}
                    className="min-h-[44px] min-w-11 shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    닫기
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto min-h-0">
                  {createStep === 1 ? <>
                    <fieldset><legend className="mb-2 text-xs font-semibold text-slate-600">수업 유형</legend><div className="flex flex-wrap gap-2">{SESSION_TYPE_OPTIONS.map((type) => <button key={type.value} type="button" aria-pressed={createForm.type === type.value} onClick={() => handleCreateChange('type', type.value)} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${createForm.type === type.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>{type.label}</button>)}</div></fieldset>
                    <CreateScheduleFields form={createForm} overrides={dayOverrides} teachers={teachers}
                      onChange={handleCreateChange} onDays={toggleCreateDay}
                      onDayChange={(day, value) => setDayOverrides((prev) => ({ ...prev, [day]: value }))}
                      onPreset={applyCreatePreset} onCopy={copyFirstDaySettings}
                      mainDefault={(id) => resolveDefaultPrice(id, createForm.type)} assistDefault={assistDefault} />
                    <section aria-label="생성 일정 미리보기" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold">생성 일정 미리보기</h3><span className="text-xs text-slate-500">총 {createPreview.length}회 · 저장 전 확인</span></div>
                      <div className="max-h-64 overflow-y-auto">{createPreview.map((session) => <div key={session.roundIndex} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-t border-slate-200 py-2 text-xs">
                        <strong className="text-slate-500">{session.roundIndex}</strong><div><p className="font-bold text-slate-800">{session.startAt.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })} {session.startAt.toTimeString().slice(0, 5)}–{session.endAt.toTimeString().slice(0, 5)}</p><p className="mt-1 break-words text-slate-600">메인 {teacherMap[session.teacherId] || '미정'} · {session.price.toLocaleString('ko-KR')}원{session.assistants.map((teacher) => ` / 보조 ${teacherMap[teacher.id] || '미정'} ${teacher.price.toLocaleString('ko-KR')}원`).join('')}</p></div>
                      </div>)}</div>
                      {!createPreview.length ? <p className="text-sm text-slate-500">날짜와 요일·총 회차를 설정하면 일정이 표시됩니다.</p> : null}
                    </section>
                  </> : null}

                  {createStep === 2 ? <CreateSessionEditor sessions={editableSessions} teachers={teachers} onChange={setEditableSessions} mainDefault={(id) => resolveDefaultPrice(id, createForm.type)} assistDefault={assistDefault} /> : null}
                </div>
                  <div className="shrink-0 z-20 flex flex-col gap-3 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
                    <p className="text-xs font-semibold text-slate-600">총 {(createStep === 1 ? createPreview : editableSessions).length}회{(createStep === 1 ? createPreview : editableSessions).length ? ` · ${(createStep === 1 ? createPreview : editableSessions)[0]!.startAt.toLocaleDateString('ko-KR')} ~ ${(createStep === 1 ? createPreview : editableSessions).at(-1)!.startAt.toLocaleDateString('ko-KR')}` : ''}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                          createStep === 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        1) 기본 설정
                      </span>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                          createStep === 2 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        2) 회차 편집
                      </span>
                    </div>
                    {createStep === 1 ? (
                      <button
                        type="button"
                        onClick={goToCreateStep2}
                        disabled={createLoading}
                        className="min-h-11 px-4 py-2 rounded-full text-sm font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
                      >
                        회차 설정으로
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setCreateStep(1)}
                          className="min-h-11 px-4 py-2 rounded-full text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          기본 설정 수정
                        </button>
                        <button
                          type="button"
                          onClick={applyFirstRowToAll}
                          className="min-h-11 px-4 py-2 rounded-full text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                          disabled={!editableSessions.length}
                        >
                          전체 동일 적용
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateSubmit}
                          disabled={createLoading}
                          className="min-h-11 px-4 py-2 rounded-full text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {createLoading ? '등록 중...' : '등록'}
                        </button>
                      </div>
                    )}
                  </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
            불러오는 중...
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm font-bold md:h-40 md:py-0">
            표시할 수업이 없습니다.
          </div>
        ) : (
          <>
          <div className="hidden overflow-x-auto -mx-3 md:block sm:mx-0">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-w-[640px] sm:min-w-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">수업명</th>
                  <th className="px-4 py-3 text-left">선생님</th>
                  <th className="px-4 py-3 text-left">진행</th>
                  <th className="px-4 py-3 text-left">첫 수업일</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-right">바로가기</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const firstDate = new Date(g.displayDateAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  });
                  const statusLabel = g.timeStatus === 'ongoing' ? '진행중' : '예정';
                  const teacherName = g.displayTeacherId ? teacherMap[g.displayTeacherId] || g.displayTeacherId : '미정';
                  const teacherUndecided =
                    !g.displayTeacherId || String(teacherName).trim() === '미정';
                  const rowKey = makeBundleCompositeKey(g.displayTeacherId, g.title);

                  return (
                    <tr
                      key={rowKey}
                      className={
                        teacherUndecided
                          ? "border-t border-red-200 bg-red-50/90 hover:bg-red-50"
                          : "border-t border-slate-100 hover:bg-slate-50/50"
                      }
                    >
                      <td
                        className={`px-4 py-3 font-bold ${
                          teacherUndecided ? "text-slate-900" : "text-slate-800"
                        }`}
                      >
                        {getCleanClassTitle(g.title)}
                      </td>
                      <td
                        className={`px-4 py-3 ${teacherUndecided ? 'font-bold text-red-600' : 'text-slate-600'}`}
                      >
                        {teacherName}
                      </td>
                      <td
                        className={`px-4 py-3 ${teacherUndecided ? "text-slate-800" : "text-slate-600"}`}
                      >
                        {g.roundTotal}회
                      </td>
                      <td
                        className={`px-4 py-3 ${teacherUndecided ? "text-slate-800" : "text-slate-600"}`}
                      >
                        {firstDate}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold ${
                            g.timeStatus === 'ongoing'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/80'
                              : 'bg-amber-50 text-amber-900 border border-amber-200/80'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            // alias 그룹이면 합쳐보기 패널을 띄움
                            const aliasRule = GROUP_ALIAS_RULES.find((r) => r.aliasTitle === g.title);
                            if (aliasRule) {
                              const groupIds = aliasGroupIdsByTitle[aliasRule.aliasTitle] || [];
                              if (groupIds.length > 0) {
                                // ✅ alias는 번들 모달로 진입 (여러 group_id 토글 가능)
                                setSelectedBundle({ bundleTitle: aliasRule.aliasTitle, groupIds });
                                return;
                              }
                            }
                            // ✅ 일반 그룹도 번들 모달로 진입 (담당 + 수업명 동일 시 여러 group_id)
                            const compositeKey = makeBundleCompositeKey(g.displayTeacherId, g.title);
                            const ids = bundleGroupIdsByKey[compositeKey] || [g.groupId];
                            const titleOnly = getBundleTitleKey(g.title);
                            setSelectedBundle({ bundleTitle: titleOnly || g.title, groupIds: ids });
                          }}
                          className="inline-flex px-3 py-1.5 rounded-full text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {groups.map((g) => {
              const firstDate = new Date(g.displayDateAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
              const statusLabel = g.timeStatus === 'ongoing' ? '진행중' : '예정';
              const teacherName = g.displayTeacherId ? teacherMap[g.displayTeacherId] || g.displayTeacherId : '미정';
              const teacherUndecided = !g.displayTeacherId || String(teacherName).trim() === '미정';
              const rowKey = makeBundleCompositeKey(g.displayTeacherId, g.title);
              const openGroup = () => {
                const aliasRule = GROUP_ALIAS_RULES.find((r) => r.aliasTitle === g.title);
                if (aliasRule) {
                  const groupIds = aliasGroupIdsByTitle[aliasRule.aliasTitle] || [];
                  if (groupIds.length > 0) { setSelectedBundle({ bundleTitle: aliasRule.aliasTitle, groupIds }); return; }
                }
                const ids = bundleGroupIdsByKey[makeBundleCompositeKey(g.displayTeacherId, g.title)] || [g.groupId];
                setSelectedBundle({ bundleTitle: getBundleTitleKey(g.title) || g.title, groupIds: ids });
              };
              return (
                <article key={rowKey} className={`rounded-2xl border p-4 ${teacherUndecided ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-black text-slate-900">{getCleanClassTitle(g.title)}</h2>
                      <p className={`mt-1 text-sm font-bold ${teacherUndecided ? 'text-red-600' : 'text-slate-600'}`}>담당 {teacherName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${g.timeStatus === 'ongoing' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{statusLabel}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs font-bold text-slate-400">다음 일정</dt><dd className="mt-1 font-bold text-slate-700">{firstDate}</dd></div>
                    <div><dt className="text-xs font-bold text-slate-400">진행</dt><dd className="mt-1 font-bold text-slate-700">{g.roundTotal}회</dd></div>
                  </dl>
                  <button type="button" onClick={openGroup} className="mt-4 min-h-[44px] w-full rounded-xl bg-blue-600 px-4 text-sm font-black text-white">관리</button>
                </article>
              );
            })}
          </div>
          </>
        )}
      </main>

      <ClassBundlePanel
        visible={!!selectedBundle}
        bundleTitle={selectedBundle?.bundleTitle || ''}
        groupIds={selectedBundle?.groupIds || []}
        onClose={() => setSelectedBundle(null)}
        onChanged={() => fetchGroups()}
      />
    </div>
  );
}

export default function ClassListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ClassListPageContent />
    </Suspense>
  );
}
