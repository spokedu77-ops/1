'use client';

import { toast } from 'sonner';
import VatCalculator from '@/app/components/admin/VatCalculator';
import styles from './TeacherSettlementReport.module.css';
import { loadXlsx } from './settlementXlsx';
import MonthlySettlementSummary, { type MonthlySettlementRow } from './MonthlySettlementSummary';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { getSessionWithRefreshRecovery } from '@/app/lib/supabase/auth';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CreditCard, Users, Calculator, Download, History, Info } from 'lucide-react';

import {
  buildSettlementExcludedIdSet, getExtraTeachersFromSession, isSettlementExcluded,
  sessionPayableFees, teacherSessionFee, settlementRecipients, settlementIssues,
  settlementPeriodBounds, readAllSettlementRows,
  type TeacherRow, type SessionRow, type SettlementRow, type SettlementIssue,
} from './settlementReconciliation';

type ReportTeacher = {
  id: string;
  name: string;
  is_active?: boolean | null;
  count: number;
  grossTotal: number;
  tax: number;
  netPay: number;
  details: SessionRow[];
  adjs: SettlementRow[];
};

/** 수업 관리 캘린더/리스트와 동일하게 회차 토큰 제거 후 제목 표시 */
function displaySessionTitle(title?: string): string {
  const raw = String(title || '').trim();
  if (!raw) return '';
  const cleaned = raw
    .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
    .replace(/\b\d+\s*(회차|회|차)\b/g, ' ')
    .replace(/[|_]/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || raw;
}

function assertMutationRow<T>(
  data: T | null,
  error: { message: string } | null | undefined
): T {
  if (error) throw error;
  if (!data) throw new Error('변경이 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.');
  return data;
}

export default function TeacherSettlementReport() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [issues, setIssues] = useState<SettlementIssue[]>([]);
  const [loadedPeriod, setLoadedPeriod] = useState('');
  const requestGeneration = useRef(0);
  const [reportData, setReportData] = useState<ReportTeacher[]>([]);
  const [sessionFeesTotal, setSessionFeesTotal] = useState(0); // 세션 수업료만 합계 (이중 합산 방지)
  const [totalAdjAmount, setTotalAdjAmount] = useState(0);   // 기타 정산 합계
  const [inputStates, setInputStates] = useState<Record<string, { amount?: string; reason?: string }>>({});

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState(now.getDate() >= 16 ? 'second' : 'first');
  const reportMatchesPeriod = loadedPeriod === `${year}-${month}-${period}`;
  const [view, setView] = useState<'period' | 'month'>('period');
  const [loadedTaxMonth, setLoadedTaxMonth] = useState('');
  const [taxSummaryData, setTaxSummaryData] = useState<MonthlySettlementRow[]>([]);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);
  const [taxSummaryError, setTaxSummaryError] = useState(false);
  const taxSummaryGeneration = useRef(0);

  useEffect(() => {
    const checkMaster = async () => {
      if (!supabase) return;
      const session = await getSessionWithRefreshRecovery(supabase);
      if (!session?.user || session.user.email !== 'choijihoon@spokedu.com') {
        router.replace('/admin');
        return;
      }
      setIsAdmin(true);
    };
    checkMaster();
  }, [router, supabase]);

  const fetchReport = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(false);
    setIssues([]);
    try {
      const now = new Date();
      const lastDay = new Date(year, month, 0).getDate();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
      const todayDay = now.getDate();

      const startDay = period === 'first' ? 1 : 16;
      let endDay = period === 'first' ? 15 : lastDay;
      if (isCurrentMonth) {
        if (period === 'second' && todayDay < 16) {
          endDay = 15;
        } else {
          endDay = Math.min(endDay, todayDay);
        }
      }

      const bounds = settlementPeriodBounds(year, month, startDay, endDay);
      const teachers = await readAllSettlementRows<TeacherRow>((from, to) => supabase
        .from('users').select('id, name, role, email, is_admin, is_active').order('id').range(from, to));
      const excludedIds = buildSettlementExcludedIdSet(teachers);
      const allSessions = endDay < startDay ? [] : await readAllSettlementRows<SessionRow>((from, to) => supabase
        .from('sessions').select('id, created_by, price, students_text, memo, start_at, end_at, title, status')
        .gte('start_at', bounds.start).lt('start_at', bounds.end).order('start_at').order('id').range(from, to));
      const pendingIssues = settlementIssues(teachers, allSessions, Date.now());
      if (generation !== requestGeneration.current) return;
      setIssues(pendingIssues);
      const sessions = allSessions.filter(s => s.status === 'finished' || s.status === 'verified');
      const dbAdjs = await readAllSettlementRows<SettlementRow>((from, to) => supabase
        .from('settlements').select('*').eq('year', year).eq('month', month).eq('period', period)
        .order('id').range(from, to));
      const teachersFiltered = settlementRecipients(teachers, sessions, dbAdjs, excludedIds);

      const sessionsList = sessions || [];
      const rawSessionFees = sessionsList.reduce(
        (sum: number, s: SessionRow) => sum + sessionPayableFees(s, excludedIds),
        0
      );
      const rawAdjTotal = (dbAdjs || []).reduce((acc: number, cur: SettlementRow) => {
        if (isSettlementExcluded(cur.teacher_id, excludedIds)) return acc;
        return acc + (Number(cur?.amount) ?? 0);
      }, 0);

      const calculatedData = teachersFiltered.map((teacher: TeacherRow) => {
        const teacherSessions = (sessions || []).filter((s: SessionRow) => {
          const isMain = String(s.created_by) === String(teacher.id);
          const extras = getExtraTeachersFromSession(s);
          const isExtra = extras.some((ex) => String(ex.id) === String(teacher.id));
          return isMain || isExtra;
        });

        const sessionsTotal = teacherSessions.reduce(
          (acc: number, cur: SessionRow) => acc + teacherSessionFee(cur, teacher.id, excludedIds),
          0
        );

        const teacherAdjs = (dbAdjs?.filter((a: SettlementRow) => a.teacher_id === teacher.id) || []) as SettlementRow[];
        const adjTotal = teacherAdjs.reduce((acc: number, cur: { amount?: number }) => acc + (Number(cur.amount) ?? 0), 0);

        const grossTotal = sessionsTotal + adjTotal;
        const tax = Math.floor(grossTotal * 0.033);
        const netPay = grossTotal - tax;

        const detailsByDate = [...teacherSessions].sort((a, b) =>
          (a.start_at || '').localeCompare(b.start_at || '')
        );

        return {
          id: teacher.id,
          name: teacher.name || 'Unknown',
          is_active: teacher.is_active,
          count: teacherSessions.length,
          grossTotal: grossTotal || 0,
          tax: tax || 0,
          netPay: netPay || 0,
          details: detailsByDate,
          adjs: teacherAdjs
        };
      })
      .sort((a: { netPay: number; name: string }, b: { netPay: number; name: string }) => b.netPay - a.netPay || a.name.localeCompare(b.name, 'ko'));

      const listedGross = calculatedData.reduce((sum, teacher) => sum + teacher.grossTotal, 0);
      if (listedGross !== rawSessionFees + rawAdjTotal) throw new Error('정산 총액과 개인별 명세가 다릅니다. 지급 전 확인해 주세요.');
      if (generation !== requestGeneration.current) return;
      setSessionFeesTotal(rawSessionFees);
      setTotalAdjAmount(rawAdjTotal);
      setReportData(calculatedData);
      setLoadedPeriod(`${year}-${month}-${period}`);
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setLoadError(true);
      setReportData([]);
      setSessionFeesTotal(0);
      setTotalAdjAmount(0);
      devLogger.error('Data load error:', error);
      toast.error(error instanceof Error ? error.message : '정산 데이터를 불러오지 못했습니다.');
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  }, [supabase, isAdmin, year, month, period]);

  useEffect(() => {
    void fetchReport();
    const refresh = () => { void fetchReport(); };
    const invalidate = () => { requestGeneration.current++; };
    window.addEventListener('focus', refresh);
    window.addEventListener('classes-auto-finish-completed', refresh);
    return () => {
      invalidate();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('classes-auto-finish-completed', refresh);
    };
  }, [fetchReport]);

  /** 세금 계산용: 선택한 연·월 한 달 전체(1일~말일) 기준 선생님별 세전 총액 */
  const fetchTaxSummary = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const generation = ++taxSummaryGeneration.current;
    setTaxSummaryLoading(true);
    setTaxSummaryError(false);
    setTaxSummaryData([]);
    try {
      const lastDay = new Date(year, month, 0).getDate();

      const bounds = settlementPeriodBounds(year, month, 1, lastDay);
      const teachers = await readAllSettlementRows<TeacherRow>((from, to) => supabase
        .from('users').select('id, name, role, email, is_admin, is_active').order('id').range(from, to));
      const excludedIds = buildSettlementExcludedIdSet(teachers);
      const sessionsList = await readAllSettlementRows<SessionRow>((from, to) => supabase
        .from('sessions').select('id, created_by, price, students_text, memo, start_at')
        .in('status', ['finished', 'verified']).gte('start_at', bounds.start).lt('start_at', bounds.end)
        .order('start_at').order('id').range(from, to));
      const dbAdjs = await readAllSettlementRows<SettlementRow>((from, to) => supabase
        .from('settlements').select('*').eq('year', year).eq('month', month).order('id').range(from, to));
      const teachersFiltered = settlementRecipients(teachers, sessionsList, dbAdjs, excludedIds);
      const calculated = teachersFiltered.map((teacher: TeacherRow) => {
        const teacherSessions = sessionsList.filter((s: SessionRow) => {
          const isMain = String(s.created_by) === String(teacher.id);
          const extras = getExtraTeachersFromSession(s);
          const isExtra = extras.some((ex) => String(ex.id) === String(teacher.id));
          return isMain || isExtra;
        });
        const sessionsTotal = teacherSessions.reduce(
          (acc: number, cur: SessionRow) => acc + teacherSessionFee(cur, teacher.id, excludedIds),
          0
        );
        const teacherAdjs = (dbAdjs?.filter((a: SettlementRow) => a.teacher_id === teacher.id) || []) as SettlementRow[];
        const adjTotal = teacherAdjs.reduce((acc: number, cur: { amount?: number }) => acc + (Number(cur.amount) ?? 0), 0);
        const grossTotal = sessionsTotal + adjTotal;
        return { id: teacher.id, name: teacher.name || 'Unknown', grossTotal, sessionsTotal, adjTotal, count: teacherSessions.length, is_active: teacher.is_active ?? true };
      });
      if (generation !== taxSummaryGeneration.current) return;
      setLoadedTaxMonth(`${year}-${month}`);
      setTaxSummaryData(
        calculated.sort(
          (a: { grossTotal: number; name: string }, b: { grossTotal: number; name: string }) =>
            b.grossTotal - a.grossTotal || a.name.localeCompare(b.name, 'ko')
        )
      );
    } catch (e) {
      if (generation !== taxSummaryGeneration.current) return;
      setTaxSummaryData([]);
      setTaxSummaryError(true);
      devLogger.error('Tax summary error:', e);
      toast.error('세금 계산용 데이터 조회 실패');
    } finally {
      if (generation === taxSummaryGeneration.current) setTaxSummaryLoading(false);
    }
  }, [supabase, isAdmin, year, month]);

  useEffect(() => {
    if (view !== 'month') return;
    void fetchTaxSummary();
    const generationRef = taxSummaryGeneration;
    return () => { generationRef.current++; };
  }, [view, fetchTaxSummary]);

  // 대시보드 합계: Total Gross = 세션 수업료 + 기타정산 (단일 기준). Net/Tax는 여기서 파생해 상단 카드가 항상 일치하도록 함
  const totalGrossFromSessions = sessionFeesTotal + totalAdjAmount;
  const derivedTax = reportData.reduce((sum, teacher) => sum + teacher.tax, 0);
  const derivedNet = totalGrossFromSessions - derivedTax;
  const stats = {
    totalNet: derivedNet,
    totalTax: derivedTax,
    totalGross: totalGrossFromSessions,
    sessionFeesTotal,
    totalAdjAmount,
    activeCount: reportData.filter(t => t.count > 0 || t.adjs.length > 0).length,
    totalCount: reportData.length
  };

  const downloadExcel = async () => {
    if (loading || loadError || !reportMatchesPeriod || exporting) return;
    setExporting(true);
    try {
      const xlsx = await loadXlsx();
      const workbook = xlsx.utils.book_new();
      const periodLabel = `${year}년 ${month}월 ${period === 'first' ? '1~15일' : '16일~말일'}`;
      const dateText = (value?: string | null) => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '';
      const addSheet = (name: string, rows: unknown[][], widths: number[], moneyColumns: number[] = []) => {
        const sheet = xlsx.utils.aoa_to_sheet(rows);
        sheet['!cols'] = widths.map((wch) => ({ wch }));
        for (let r = 0; r < rows.length; r++) {
          for (const c of moneyColumns) {
            if (typeof rows[r][c] !== 'number') continue;
            const cell = sheet[`${xlsx.utils.encode_col(c)}${r + 1}`] as { z?: string } | undefined;
            if (cell) cell.z = '#,##0"원"';
          }
        }
        xlsx.utils.book_append_sheet(workbook, sheet, name);
      };
      addSheet('강사별 정산', [
        ['강사 정산', periodLabel],
        ['현재 화면의 조회 결과 기준 · 미완료 수업 제외 · 금액 단위: 원'],
        ['강사명', '활동 상태', '수업 회기', '수업료', '기타 정산', '세전 합계', '원천징수 3.3%', '실지급액'],
        ...reportData.map((teacher) => [teacher.name, teacher.is_active === false ? '종료' : '활동', teacher.count,
          teacher.grossTotal - teacher.adjs.reduce((sum, adj) => sum + Number(adj.amount || 0), 0),
          teacher.adjs.reduce((sum, adj) => sum + Number(adj.amount || 0), 0), teacher.grossTotal, teacher.tax, teacher.netPay]),
        ['합계', '', reportData.reduce((sum, teacher) => sum + teacher.count, 0), stats.sessionFeesTotal,
          stats.totalAdjAmount, stats.totalGross, stats.totalTax, stats.totalNet],
      ], [20, 12, 12, 18, 18, 18, 18, 18], [3, 4, 5, 6, 7]);
      addSheet('수업 상세', [
        ['조회 기간', periodLabel], ['강사명', '수업 일시 (한국 시간)', '수업명', '진행 상태', '수업료', '수업 ID'],
        ...reportData.flatMap((teacher) => teacher.details.map((session) => [teacher.name, dateText(session.start_at),
          displaySessionTitle(session.title), session.status === 'verified' ? '검수 완료' : '수업 완료',
          teacherSessionFee(session, teacher.id, new Set()), session.id])),
      ], [20, 28, 45, 16, 18, 38], [4]);
      addSheet('기타 정산', [
        ['조회 기간', periodLabel], ['강사명', '사유', '금액', '정산 ID'],
        ...reportData.flatMap((teacher) => teacher.adjs.map((adj) => [teacher.name, adj.reason, Number(adj.amount || 0), adj.id])),
      ], [20, 55, 18, 38], [2]);
      if (issues.length) addSheet('확인 필요', [
        ['조회 기간', periodLabel], ['수업명', '수업 일시 (한국 시간)', '사유', '금액', '지급액에서 제외'],
        ...issues.map((issue) => [issue.title, dateText(issue.start_at), issue.reason, issue.amount ?? '금액 확인 필요', issue.excludedFromPay ? '예' : '아니오']),
      ], [40, 28, 65, 18, 18], [3]);
      xlsx.writeFile(workbook, `강사정산_${year}-${String(month).padStart(2, '0')}_${period === 'first' ? '1-15일' : '16-말일'}.xlsx`);
    } catch (error) {
      devLogger.error('Settlement Excel export error:', error);
      toast.error('엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  const downloadImage = async (teacher: ReportTeacher) => {
    try {
      await document.fonts?.ready;
      const scale = 2;
      const width = 580;
      const height = 350;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(40, 40, 500, 270, 24);
      ctx.stroke();

      const left = 72;
      const right = 508;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#111111';
      ctx.font = '700 24px "Malgun Gothic", sans-serif';
      ctx.fillText(`${teacher.name} 정산 내역`, left, 72);
      ctx.fillStyle = '#999999';
      ctx.font = '500 13px "Malgun Gothic", sans-serif';
      ctx.fillText(`${year}년 ${month}월 ${period === 'first' ? '1-15일' : '16-말일'}`, left, 108);

      ctx.strokeStyle = '#eeeeee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, 145);
      ctx.lineTo(right, 145);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(left, 169, right - left, 109, 16);
      ctx.fill();

      const drawRow = (label: string, value: string, y: number, color: string, font: string) => {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.fillText(label, 92, y);
        ctx.textAlign = 'right';
        ctx.fillText(value, 488, y);
      };
      drawRow('세전 합계', `${(teacher.grossTotal || 0).toLocaleString()}원`, 188, '#666666', '500 12px "Malgun Gothic", sans-serif');
      drawRow('원천징수(3.3%)', `-${(teacher.tax || 0).toLocaleString()}원`, 214, '#ef4444', '500 12px "Malgun Gothic", sans-serif');
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(92, 241);
      ctx.lineTo(488, 241);
      ctx.stroke();
      drawRow('실지급액', '', 252, '#1e293b', '700 13px "Malgun Gothic", sans-serif');
      ctx.fillStyle = '#2563eb';
      ctx.font = '900 24px "Malgun Gothic", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${(teacher.netPay || 0).toLocaleString()}원`, 488, 247);

      const dataUrl = canvas.toDataURL('image/png', 1);
      const link = document.createElement('a'); link.href = dataUrl;
      link.download = `${teacher.name}_정산서_${year}_${month}.png`; link.click();
    } catch (error) {
      devLogger.error('Settlement receipt image error:', error);
      toast.error('정산서 이미지를 만들지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const addAdjItem = async (teacherId: string) => {
    const target = inputStates[teacherId];
    if (!target?.amount || !target?.reason) return toast.error('금액과 사유를 입력하세요.');
    try {
      const { data, error } = await supabase
        .from('settlements')
        .insert({ teacher_id: teacherId, amount: Number(target.amount), reason: target.reason, year, month, period })
        .select('id')
        .maybeSingle();
      assertMutationRow(data, error);
      setInputStates({...inputStates, [teacherId]: { amount: '', reason: '' }});
      fetchReport();
    } catch (err) {
      devLogger.error('Settlement adjustment insert error:', err);
      toast.error(err instanceof Error ? err.message : '정산 항목 추가에 실패했습니다.');
    }
  };

  const removeAdjItem = async (adjId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { data, error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', adjId)
        .select('id')
        .maybeSingle();
      assertMutationRow(data, error);
      fetchReport();
    } catch (err) {
      devLogger.error('Settlement adjustment delete error:', err);
      toast.error(err instanceof Error ? err.message : '정산 항목 삭제에 실패했습니다.');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.page}>

      {/* 상단 헤더 & 필터 */}
      <div className={styles.header}>
        <div className="space-y-1">
          <h1 className={styles.heading}>강사 정산</h1>
          <p className={styles.subtitle}>기간별 수업료와 원천징수, 실지급액을 확인합니다.</p>
        </div>

        <div className={styles.tools}>
          {view === 'period' && <button type="button" onClick={downloadExcel} disabled={loading || loadError || !reportMatchesPeriod || exporting} className={styles.taxButton}>
            <Download size={14} />{exporting ? '파일 생성 중…' : '엑셀 다운로드'}
          </button>}

          <VatCalculator />
        </div>
      </div>
      <div className={styles.workspaceBar}>
        <div className={styles.viewTabs} role="tablist" aria-label="강사 정산 보기">
          <button type="button" role="tab" aria-selected={view === 'period'} onClick={() => setView('period')}>기간별 정산</button>
          <button type="button" role="tab" aria-selected={view === 'month'} onClick={() => setView('month')}>월별 세전 내역</button>
        </div>
          <div className={styles.period}>
          <select aria-label="정산 연도" value={year} onChange={(e) => { setYear(Number(e.target.value)); taxSummaryGeneration.current++; }} className="p-2 text-slate-400 outline-none bg-transparent cursor-pointer text-xs font-black uppercase">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div className="w-[1px] h-3 bg-slate-100 mx-1"></div>
          <select aria-label="정산 월" value={month} onChange={(e) => { setMonth(Number(e.target.value)); taxSummaryGeneration.current++; }} className="p-2 text-indigo-600 outline-none bg-transparent cursor-pointer text-xs font-black">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          {view === 'period' && <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
            <button onClick={() => setPeriod('first')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${period === 'first' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1-15일</button>
            <button onClick={() => setPeriod('second')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${period === 'second' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>16-말일</button>
          </div>}
        </div>
      </div>

      {view === 'month' && <MonthlySettlementSummary year={year} month={month} rows={taxSummaryData}
        loading={taxSummaryLoading || (loadedTaxMonth !== `${year}-${month}` && !taxSummaryError)} error={taxSummaryError}
        onRefresh={() => void fetchTaxSummary()} />}
      <div hidden={view !== 'period'}>
      {(loading || (!reportMatchesPeriod && !loadError)) && <p role="status" className="mb-4 text-sm font-semibold text-slate-600">정산 데이터를 대조하는 중입니다.</p>}
      {loadError && <div role="alert" className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-5 text-red-900">
        <p className="font-bold">정산 조회 또는 합계 대조에 실패했습니다. 지급 전에 오류를 해결해 주세요.</p>
        <button type="button" onClick={() => void fetchReport()} className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 font-semibold">다시 조회</button>
      </div>}
      {!loading && issues.length > 0 && <section aria-label="정산 확인 필요 내역" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <h2 className="font-bold">정산 확인 필요 {issues.length}건</h2>
        <p className="mt-2 font-semibold">미완료로 제외된 확인 대상 금액: {issues.filter(issue => issue.excludedFromPay).reduce((sum, issue) => sum + (issue.amount ?? 0), 0).toLocaleString()}원 · 금액 미확인 {issues.filter(issue => issue.amount === null).length}건</p>
        <p className="mt-2 text-sm">미완료 수업은 지급액에 포함되지 않습니다. 비활성 계정의 과거 지급액은 명세에 포함됩니다. 잘못된 배정은 실제 강사와 금액을 확인해 주세요.</p>
        <ul className="mt-3 space-y-3">{issues.map(issue => <li key={issue.id} className="text-sm">
          <span className="font-bold">{issue.title}</span>
          <span> · {issue.start_at ? new Date(issue.start_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : ''} · {issue.amount === null ? '금액 확인 필요' : `${issue.amount.toLocaleString()}원`}</span>
          <p>{issue.reason}</p>
        </li>)}</ul>
      </section>}

      {!loading && !loadError && reportMatchesPeriod && <>
      {/* [ Image of Monthly Settlement Summary Dashboard ] */}
      {/* 1. 월별 정산 총합 대시보드 (Total Summary) */}
      <section className={styles.summary} aria-label="선택 기간 정산 요약">
        <div className={styles.netCard}>
          <p className={styles.metricLabel}><CreditCard size={15}/> 실지급액</p>
          <p className={styles.netAmount}>
            {(stats.totalNet || 0).toLocaleString()}
            <span>원</span>
          </p>
          <div className={styles.metricHint}>
            <span className="flex items-center gap-1.5"><Users size={13}/> 지급 대상 {stats.activeCount}명</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}><Calculator size={15}/> 원천징수 3.3%</p>
          <p className={styles.taxAmount}>
            {(stats.totalTax || 0).toLocaleString()}
            <span>원</span>
          </p>
          <p className={styles.metricHint}>세전 금액에서 공제</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>세전 합계</p>
          <p className={styles.grossAmount}>
            {(stats.totalGross || 0).toLocaleString()}
            <span>원</span>
          </p>
          <div className={styles.breakdown}>
            <p>수업료: {(stats.sessionFeesTotal ?? 0).toLocaleString()}원</p>
            <p className={stats.totalAdjAmount >= 0 ? 'text-slate-500' : 'text-red-500'}>기타 정산: {stats.totalAdjAmount >= 0 ? '+' : ''}{(stats.totalAdjAmount ?? 0).toLocaleString()}원</p>
          </div>
        </div>
      </section>

      {/* 2. 강사별 정산 리스트 (0원 포함) */}
      <div className={styles.teacherGrid}>
        {reportData.map((teacher: ReportTeacher) => (
          <div key={teacher.id} className="group flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandedTeacher === teacher.id}
              aria-label={`${teacher.name} 정산 상세`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id);
                }
              }}
              onClick={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)}
              className={`bg-white rounded-xl border p-4 flex justify-between items-center transition-all cursor-pointer shadow-sm ${
                expandedTeacher === teacher.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200 hover:border-blue-300'
              } ${teacher.netPay === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${teacher.netPay > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {teacher.name.slice(0, 1)}
                </div>
                <div className="font-black">
                  <h3 className="text-[15px] text-slate-900 leading-tight">{teacher.name} {teacher.is_active === false && <span className="text-xs text-amber-700">(비활성 · 과거 정산 포함)</span>}</h3>
                  <p className="text-[11px] text-slate-500">{teacher.count}회 수업</p>
                </div>
              </div>
              <div className="text-right font-black">
                <p className={`text-xl tracking-tight tabular-nums ${teacher.netPay > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                  {(teacher.netPay || 0).toLocaleString()}<span className="text-xs ml-1 not-italic">원</span>
                </p>
                <p className="text-[11px] text-slate-400 font-bold not-italic mt-0.5">실수령액</p>
              </div>
            </div>

            {expandedTeacher === teacher.id && (
              <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-4">
                <div className="flex flex-wrap gap-3 justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span>세전 {(teacher.grossTotal || 0).toLocaleString()}원</span>
                    <span className="text-red-500">원천징수 {(teacher.tax || 0).toLocaleString()}원</span>
                  </div>
                  <button onClick={() => downloadImage(teacher)} className="text-[11px] font-black px-4 py-2 border border-slate-200 rounded-lg min-h-11 hover:bg-black hover:text-white transition-all flex items-center gap-2"><Download size={12}/> 명세서</button>
                </div>

                <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="금액" value={inputStates[teacher.id]?.amount || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], amount: e.target.value}})} className="w-24 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                    <input type="text" placeholder="기타 정산 사유" value={inputStates[teacher.id]?.reason || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], reason: e.target.value}})} className="flex-1 min-w-0 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                  </div>
                  <button onClick={() => addAdjItem(teacher.id)} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-black hover:bg-black transition-all">정산 항목 추가</button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  <p className="text-[11px] font-black text-slate-500 px-2 mb-2"><History size={10} className="inline mr-1"/> 수업 내역</p>
                  {teacher.details.map((s: SessionRow) => {
                    const fee = teacherSessionFee(s, teacher.id, new Set());
                    return (
                      <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl text-[11px] font-black group-hover:bg-white transition-colors">
                        <span className="text-slate-300 italic">{(s.start_at || '').slice(8, 10)}일</span>
                        <span className="flex-1 text-slate-700 truncate mx-4">{displaySessionTitle(s.title)}</span>
                        <span className="text-slate-900">{(fee || 0).toLocaleString()}원</span>
                      </div>
                    );
                  })}
                  {teacher.adjs.map((a: SettlementRow) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl text-[11px] font-black text-indigo-600 border border-indigo-100/20">
                      <span className="flex-1 truncate mx-2">[기타] {a.reason}</span>
                      <div className="flex items-center gap-3">
                        <span>{(a.amount ?? 0) > 0 ? '+' : ''}{(Number(a.amount ?? 0)).toLocaleString()}원</span>
                        <button onClick={() => removeAdjItem(a.id)} className="text-red-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                  {teacher.count === 0 && teacher.adjs.length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-xs">선택 기간의 수업 내역이 없습니다.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/30 flex items-start gap-4">
        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg"><Info size={16}/></div>
        <div>
          <h4 className="text-xs font-bold text-blue-900 mb-1">정산 안내</h4>
          <p className="text-xs font-bold text-blue-700 leading-relaxed">
            모든 강사료는 프리랜서 사업소득(3.3%) 원천징수 후 지급됩니다. 활동이 없는 강사님도 누락 방지를 위해 명단에 포함되어 있으며, 최종 지급액이 0원인 경우 별도의 명세서가 발행되지 않습니다.
          </p>
        </div>
      </div>

      </>}
      </div>


    </div>
  );
}
