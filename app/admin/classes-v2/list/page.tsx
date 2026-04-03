"use client";

import { toast } from 'sonner';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import type { ClassGroup, EditableSession } from '@/app/admin/classes-shared/types';
import {
  computeTier,
  effectiveFees,
  totalLessonsFromCounts,
} from '@/app/lib/teacherTierSchedule';
import ClassDetailPanelV2 from '../components/ClassDetailPanelV2';
import { GROUP_ALIAS_RULES } from '../lib/groupAliases';
import ClassAliasViewerPanel from '../components/ClassAliasViewerPanel';
import ClassBundlePanelV2 from '../components/ClassBundlePanelV2';
import {
  getCleanClassTitle,
  getBundleTitleKey,
  makeBundleCompositeKey,
  getBundleTitleFromCompositeKey,
} from '../lib/v2BundleResolve';

type DayOption = { label: string; value: number };
const DAYS: DayOption[] = [
  { label: '일', value: 0 },
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
];

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

type AliasRow = {
  aliasTitle: string;
  groupIds: string[];
};

type BundleSelection = {
  bundleTitle: string;
  groupIds: string[];
};

type TeacherOption = {
  id: string;
  name: string;
  session_count?: number | null;
  fee_private?: number | null;
  fee_group?: number | null;
  fee_center_main?: number | null;
  fee_center_assist?: number | null;
};

export default function ClassListPageV2() {
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedAlias, setSelectedAlias] = useState<AliasRow | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<BundleSelection | null>(null);
  const [aliasGroupIdsByTitle, setAliasGroupIdsByTitle] = useState<Record<string, string[]>>({});
  const [bundleGroupIdsByKey, setBundleGroupIdsByKey] = useState<Record<string, string[]>>({});

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    type: 'regular_private',
    oneDayPlacement: 'private' as 'center' | 'private',
    teacherId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: '60',
    price: 30000,
    weeklyFrequency: 1,
    daysOfWeek: [new Date().getDay()],
    sessionCount: 4,
    roundWeight: 1,
  });
  const [editableSessions, setEditableSessions] = useState<EditableSession[]>([]);

  const resolveDefaultPrice = useCallback(
    (
      teacherId: string,
      clsType: string,
      oneDayPlacement: 'center' | 'private',
    ): number => {
      const selectedTeacher = teachers.find((t) => t.id === teacherId);
      if (!selectedTeacher) return Number(createForm.price) || 30000;
      const tier = computeTier(totalLessonsFromCounts(selectedTeacher.session_count ?? 0, 0));
      const fees = effectiveFees(tier, {
        fee_private: selectedTeacher.fee_private ?? null,
        fee_group: selectedTeacher.fee_group ?? null,
        fee_center_main: selectedTeacher.fee_center_main ?? null,
        fee_center_assist: selectedTeacher.fee_center_assist ?? null,
      });

      if (clsType === 'regular_center') return fees.fee_center_main;
      if (clsType === 'one_day') {
        return oneDayPlacement === 'center' ? fees.fee_center_main : fees.fee_private;
      }
      return fees.fee_private;
    },
    [createForm.price, teachers],
  );

  const fetchGroups = useCallback(async () => {
    if (!supabase) return;
    try {
      const [sessionsRes, usersRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('group_id, title, start_at, end_at, status, created_by, round_total, round_index')
          .not('status', 'in', '("deleted")'),
        supabase
          .from('users')
          .select('id, name, session_count, fee_private, fee_group, fee_center_main, fee_center_assist')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);

      if (usersRes.data) {
        const map: Record<string, string> = {};
        const list = usersRes.data as TeacherOption[];
        list.forEach((u) => {
          map[u.id] = u.name ?? '';
        });
        setTeacherMap(map);
        setTeachers(list);
      }

      const { data, error } = sessionsRes;
      if (error) throw error;
      if (!data) {
        setGroups([]);
        return;
      }

      // ✅ 리스트 "N회" 표시: 취소는 계약 회차를 줄이지 않음.
      // 1) 그룹별 DB round_total 최댓값(삭제 제외)
      // 2) 없으면 삭제·연기 제외 슬롯 수(취소 포함)
      const maxRoundTotalByGroup: Record<string, number> = {};
      const slotCountByGroup: Record<string, number> = {};
      for (const row of data as any[]) {
        if (!row.group_id) continue;
        const st = String(row.status ?? '');
        const key = String(row.group_id);
        if (st !== 'deleted') {
          const rt = Number(row.round_total);
          if (Number.isFinite(rt) && rt > 0) {
            maxRoundTotalByGroup[key] = Math.max(maxRoundTotalByGroup[key] ?? 0, rt);
          }
        }
        if (st !== 'postponed' && st !== 'deleted') {
          slotCountByGroup[key] = (slotCountByGroup[key] ?? 0) + 1;
        }
      }

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
          const roundTotal =
            maxRoundTotalByGroup[key] ?? slotCountByGroup[key] ?? Number(row.round_total) ?? 1;
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
          g.roundTotal = maxRoundTotalByGroup[key] ?? slotCountByGroup[key] ?? g.roundTotal;
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
        earliestUpcomingStartMs,
        maxEndMs,
        minStartMs,
        earliestUpcomingStartAt,
        earliestOngoingStartAt,
      } of byGroup.values()) {
        const hasOngoing = Number.isFinite(earliestOngoingStartMs) && earliestOngoingStartMs !== Number.POSITIVE_INFINITY;
        const hasUpcoming = Number.isFinite(earliestUpcomingStartMs) && earliestUpcomingStartMs !== Number.POSITIVE_INFINITY;

        // ✅ 시리즈 관점: (1) 아직 시작 전이면 예정, (2) 모두 끝났으면 완료, (3) 그 외는 진행중
        const timeStatus: TimeStatus =
          Number.isFinite(minStartMs) && now < minStartMs
            ? 'upcoming'
            : Number.isFinite(maxEndMs) && now > maxEndMs
              ? 'completed'
              : 'ongoing';
        if (timeStatus === 'completed') continue; // ✅ 완료(종료) 그룹은 숨김

        g.timeStatus = timeStatus;
        g.displayTeacherId = (hasOngoing ? ongoingTeacherId : earliestUpcomingTeacherId) ?? null;
        // ✅ 대표 날짜: 진행중이면 "가장 가까운 진행중(또는 다음 예정)", 예정이면 "다음 예정"
        g.displayDateAt =
          (timeStatus === 'ongoing' ? (earliestOngoingStartAt || earliestUpcomingStartAt) : earliestUpcomingStartAt) ||
          g.firstClassAt;
        list.push(g);
      }

      // ✅ 수업명(정제 후) 가나다순
      list.sort((a, b) => getCleanClassTitle(a.title).localeCompare(getCleanClassTitle(b.title), 'ko-KR'));

      // ✅ V2 가상 그룹(별칭): group_id 기반으로만 묶기(오탐 방지)
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
      devLogger.error(err);
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
    router.replace('/admin/classes-v2/list', { scroll: false });
  }, [loading, aliasGroupIdsByTitle, bundleGroupIdsByKey, router]);

  const handleCreateChange = (field: string, value: string | number | boolean) => {
    setCreateForm((prev) => {
      if (field === 'type' && value === 'one_day') {
        return {
          ...prev,
          type: value,
          oneDayPlacement: 'private',
          weeklyFrequency: 1,
          sessionCount: 1,
          roundWeight: 1,
          daysOfWeek: [new Date(`${prev.startDate}T${prev.startTime}`).getDay()],
        };
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
      return { ...prev, [field]: value };
    });
  };

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setIsCreateOpen(true);
    setCreateStep(1);
    setEditableSessions([]);
    router.replace('/admin/classes-v2/list', { scroll: false });
  }, [router, searchParams]);

  const toggleCreateDay = (dayValue: number) => {
    setCreateForm((prev) => {
      const baseDay = new Date(`${prev.startDate}T${prev.startTime}`).getDay();
      if (dayValue === baseDay) return prev;
      const exists = prev.daysOfWeek.includes(dayValue);
      const nextDays = exists
        ? prev.daysOfWeek.filter((d) => d !== dayValue)
        : [...prev.daysOfWeek, dayValue].sort((a, b) => a - b);
      return { ...prev, daysOfWeek: nextDays };
    });
  };

  const buildCreateDates = () => {
    const sessions: Date[] = [];
    const start = new Date(`${createForm.startDate}T${createForm.startTime}`);
    if (createForm.type === 'one_day') return [start];
    const selectedDays = createForm.daysOfWeek.length ? createForm.daysOfWeek : [start.getDay()];
    const cursor = new Date(start);

    while (sessions.length < createForm.sessionCount) {
      const weekStart = new Date(cursor);
      weekStart.setDate(cursor.getDate() - cursor.getDay());

      for (const d of selectedDays) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        dayDate.setHours(start.getHours(), start.getMinutes(), 0, 0);

        if (dayDate >= start && sessions.length < createForm.sessionCount) {
          sessions.push(new Date(dayDate));
        }
      }
      cursor.setDate(cursor.getDate() + 7);
    }
    return sessions;
  };

  const initializeEditableSessions = () => {
    const dates = buildCreateDates();
    const next: EditableSession[] = dates.map((startDateTime, index) => {
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(
        endDateTime.getMinutes() + Number(createForm.durationMinutes || '60')
      );
      return {
        roundIndex: index + 1,
        startAt: startDateTime,
        endAt: endDateTime,
        teacherId: createForm.teacherId,
        price: Number(createForm.price) || 0,
      };
    });
    setEditableSessions(next);
  };

  const goToCreateStep2 = () => {
    if (!createForm.title || !createForm.teacherId) return toast.error('수업명과 강사를 확인해주세요!');
    if (
      createForm.type !== 'one_day' &&
      createForm.weeklyFrequency > 1 &&
      createForm.daysOfWeek.length < createForm.weeklyFrequency
    ) {
      return toast.error('주간 횟수만큼 요일을 선택해주세요.');
    }
    initializeEditableSessions();
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
      return { ...s, teacherId: first.teacherId, price: first.price, startAt: start, endAt: end };
    });
    setEditableSessions(updated);
  };

  const resetCreate = () => {
    setCreateStep(1);
    setEditableSessions([]);
    setCreateForm({
      title: '',
      type: 'regular_private',
      oneDayPlacement: 'private',
      teacherId: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      durationMinutes: '60',
      price: 30000,
      weeklyFrequency: 1,
      daysOfWeek: [new Date().getDay()],
      sessionCount: 4,
      roundWeight: 1,
    });
  };

  const handleCreateSubmit = async () => {
    if (!supabase) return;
    if (!editableSessions.length) return toast.error('회차가 없습니다. 회차를 먼저 생성해주세요.');

    setCreateLoading(true);
    try {
      const commonGroupId = crypto.randomUUID();
      const sorted = [...editableSessions].sort((a, b) => a.roundIndex - b.roundIndex);
      const totalRounds = sorted.length;

      const isOneDay = createForm.type === 'one_day';
      const sessionType = isOneDay
        ? createForm.oneDayPlacement === 'center'
          ? 'one_day_center'
          : 'one_day_private'
        : createForm.type;

      const sessionsToInsert: Record<string, unknown>[] = [];
      sorted.forEach((session, idx) => {
        const roundIndex = idx + 1;
        const roundDisplay = isOneDay
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

  useEffect(() => {
    if (!createForm.teacherId) return;
    const nextPrice = resolveDefaultPrice(
      createForm.teacherId,
      createForm.type,
      createForm.oneDayPlacement,
    );
    if (Number(createForm.price) !== nextPrice) {
      setCreateForm((prev) => ({ ...prev, price: nextPrice }));
    }
  }, [
    createForm.oneDayPlacement,
    createForm.price,
    createForm.teacherId,
    createForm.type,
    resolveDefaultPrice,
  ]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 px-6 py-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">수업 목록 (V2)</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">
              group_id 기준으로 묶인 수업 시리즈입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
            >
              새 수업 개설
            </button>
            <Link
              href="/admin/classes-v2/calendar"
              className="px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              캘린더 보기 (V2)
            </Link>
          </div>
        </div>

        {isCreateOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsCreateOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">수업 개설 (V2)</h2>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      기존 개설 로직(날짜 생성 → 회차 편집 → insert)을 그대로 사용합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateOpen(false);
                      resetCreate();
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    닫기
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'regular_private', label: '과외', icon: '🏠' },
                      { id: 'regular_center', label: '센터', icon: '🏢' },
                      { id: 'one_day', label: '원데이', icon: '🎉' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleCreateChange('type', t.id)}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${
                          createForm.type === t.id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-100 bg-white text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-sm font-black">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">수업명</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                        value={createForm.title}
                        onChange={(e) => handleCreateChange('title', e.target.value)}
                        placeholder="예: 스피치 8회"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">담당 강사</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold"
                        value={createForm.teacherId}
                        onChange={(e) => handleCreateChange('teacherId', e.target.value)}
                      >
                        <option value="">강사를 선택하세요</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} T
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {createForm.type === 'one_day' && (
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-white text-xs font-black">원데이 타입</span>
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-full">
                          총 1회
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateChange('oneDayPlacement', 'center')}
                          className={`flex-1 py-3 rounded-xl text-sm font-black border ${
                            createForm.oneDayPlacement === 'center'
                              ? 'bg-blue-600 text-white border-blue-500'
                              : 'bg-slate-800 text-white/70 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          센터
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCreateChange('oneDayPlacement', 'private')}
                          className={`flex-1 py-3 rounded-xl text-sm font-black border ${
                            createForm.oneDayPlacement === 'private'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-white/70 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          개인
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">첫 수업일</label>
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold"
                        value={createForm.startDate}
                        onChange={(e) => handleCreateChange('startDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">시작 시간</label>
                      <input
                        type="time"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold"
                        value={createForm.startTime}
                        onChange={(e) => handleCreateChange('startTime', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">수업 시간</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold"
                        value={createForm.durationMinutes}
                        onChange={(e) => handleCreateChange('durationMinutes', e.target.value)}
                      >
                        {[60, 90, 120].map((m) => (
                          <option key={m} value={m}>
                            {m}분
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-600">수업료(1회)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold"
                        value={createForm.price}
                        onChange={(e) => handleCreateChange('price', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {createForm.type !== 'one_day' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-xs font-black text-slate-700">주당 횟수</label>
                        <select
                          value={createForm.weeklyFrequency}
                          onChange={(e) => handleCreateChange('weeklyFrequency', Number(e.target.value))}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                        >
                          {[1, 2].map((n) => (
                            <option key={n} value={n}>
                              {n}회
                            </option>
                          ))}
                        </select>

                        <label className="text-xs font-black text-slate-700">총 회차</label>
                        <input
                          type="number"
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold"
                          value={createForm.sessionCount}
                          onChange={(e) => handleCreateChange('sessionCount', Number(e.target.value))}
                        />

                        <label className="text-xs font-black text-slate-700">회차 표시</label>
                        <select
                          value={createForm.roundWeight}
                          onChange={(e) => handleCreateChange('roundWeight', Number(e.target.value))}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                        >
                          <option value={1}>기본</option>
                          <option value={1.5}>90분(1.5회)</option>
                        </select>
                      </div>

                      {createForm.weeklyFrequency === 1 ? (
                        <div className="text-xs font-bold text-slate-600">
                          수업 요일:{" "}
                          {
                            DAYS.find(
                              (d) =>
                                d.value ===
                                new Date(`${createForm.startDate}T${createForm.startTime}`).getDay()
                            )?.label
                          }
                          요일 (첫 수업일 기준 자동)
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs font-black text-slate-700">
                            추가 요일 선택 ({createForm.weeklyFrequency - 1}개 더)
                          </div>
                          <div className="flex gap-2">
                            {DAYS.map((d) => {
                              const baseDay = new Date(
                                `${createForm.startDate}T${createForm.startTime}`
                              ).getDay();
                              const isBase = d.value === baseDay;
                              const isSelected = createForm.daysOfWeek.includes(d.value);
                              return (
                                <button
                                  key={d.value}
                                  type="button"
                                  onClick={() => toggleCreateDay(d.value)}
                                  disabled={isBase}
                                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                                    isBase
                                      ? 'bg-blue-600 text-white cursor-not-allowed'
                                      : isSelected
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                        className="px-4 py-2 rounded-full text-sm font-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        회차 설정으로
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCreateStep(1)}
                          className="px-4 py-2 rounded-full text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          기본 설정 수정
                        </button>
                        <button
                          type="button"
                          onClick={applyFirstRowToAll}
                          className="px-4 py-2 rounded-full text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200"
                          disabled={!editableSessions.length}
                        >
                          전체 동일 적용
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateSubmit}
                          disabled={createLoading}
                          className="px-4 py-2 rounded-full text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {createLoading ? '등록 중...' : '등록'}
                        </button>
                      </div>
                    )}
                  </div>

                  {createStep === 2 && (
                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">회차</th>
                            <th className="px-3 py-2 text-left">날짜</th>
                            <th className="px-3 py-2 text-left">시간</th>
                            <th className="px-3 py-2 text-left">선생님</th>
                            <th className="px-3 py-2 text-right">금액</th>
                            <th className="px-3 py-2 text-center">삭제</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableSessions.map((s, idx) => {
                            const startDateStr = s.startAt.toISOString().split('T')[0];
                            const timeStr = s.startAt.toTimeString().slice(0, 5);
                            return (
                              <tr key={idx} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-bold text-slate-700">
                                  {s.roundIndex}/{editableSessions.length}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="date"
                                    className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                    value={startDateStr}
                                    onChange={(e) => {
                                      const next = [...editableSessions];
                                      const d = new Date(next[idx].startAt);
                                      const [y, m, dStr] = e.target.value.split('-').map(Number);
                                      d.setFullYear(y, m - 1, dStr);
                                      const duration =
                                        (next[idx].endAt.getTime() - next[idx].startAt.getTime()) /
                                        (1000 * 60);
                                      const end = new Date(d);
                                      end.setMinutes(end.getMinutes() + duration);
                                      next[idx] = { ...next[idx], startAt: d, endAt: end };
                                      setEditableSessions(next);
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="time"
                                    className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                    value={timeStr}
                                    onChange={(e) => {
                                      const next = [...editableSessions];
                                      const [hh, mm] = e.target.value.split(':').map(Number);
                                      const d = new Date(next[idx].startAt);
                                      d.setHours(hh, mm, 0, 0);
                                      const duration =
                                        (next[idx].endAt.getTime() - next[idx].startAt.getTime()) /
                                        (1000 * 60);
                                      const end = new Date(d);
                                      end.setMinutes(end.getMinutes() + duration);
                                      next[idx] = { ...next[idx], startAt: d, endAt: end };
                                      setEditableSessions(next);
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    className="bg-transparent border rounded-lg px-2 py-1 text-xs"
                                    value={s.teacherId}
                                    onChange={(e) => {
                                      const next = [...editableSessions];
                                      const nextTeacherId = e.target.value;
                                      const nextPrice = resolveDefaultPrice(
                                        nextTeacherId,
                                        createForm.type,
                                        createForm.oneDayPlacement,
                                      );
                                      next[idx] = {
                                        ...next[idx],
                                        teacherId: nextTeacherId,
                                        price: nextPrice,
                                      };
                                      setEditableSessions(next);
                                    }}
                                  >
                                    <option value="">기본 강사</option>
                                    {teachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name} T
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    className="w-24 bg-transparent border rounded-lg px-2 py-1 text-xs text-right"
                                    value={s.price}
                                    onChange={(e) => {
                                      const next = [...editableSessions];
                                      next[idx] = { ...next[idx], price: Number(e.target.value) || 0 };
                                      setEditableSessions(next);
                                    }}
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    className="px-2 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    onClick={() => {
                                      const next = editableSessions.filter((_, i) => i !== idx);
                                      const reindexed = next.map((row, i) => ({
                                        ...row,
                                        roundIndex: i + 1,
                                      }));
                                      setEditableSessions(reindexed);
                                    }}
                                  >
                                    삭제
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm font-bold">
            표시할 수업이 없습니다.
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
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
                  const teacherName = g.displayTeacherId ? teacherMap[g.displayTeacherId] || g.displayTeacherId : '-';
                  const rowKey = makeBundleCompositeKey(g.displayTeacherId, g.title);

                  return (
                    <tr key={rowKey} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {getCleanClassTitle(g.title)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{teacherName}</td>
                      <td className="px-4 py-3 text-slate-600">{g.roundTotal}회</td>
                      <td className="px-4 py-3 text-slate-600">{firstDate}</td>
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
        )}
      </main>

      <ClassAliasViewerPanel
        visible={!!selectedAlias}
        aliasTitle={selectedAlias?.aliasTitle || ''}
        groupIds={selectedAlias?.groupIds || []}
        onClose={() => setSelectedAlias(null)}
      />

      <ClassBundlePanelV2
        visible={!!selectedBundle}
        bundleTitle={selectedBundle?.bundleTitle || ''}
        groupIds={selectedBundle?.groupIds || []}
        onClose={() => setSelectedBundle(null)}
        onChanged={() => fetchGroups()}
      />

      <ClassDetailPanelV2
        groupId={selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
        onChanged={() => fetchGroups()}
      />
    </div>
  );
}

