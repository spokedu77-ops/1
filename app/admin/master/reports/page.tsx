'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { devLogger } from '@/app/lib/logging/devLogger';
import { CreditCard, Users, Calculator, Download, History, Info, TrendingUp, FileText, X } from 'lucide-react';
import { ADMIN_NAMES } from '@/app/lib/constants/admin';

type TeacherRow = { id: string; name: string };
type ExtraTeacher = { id: string; price?: number };
type SessionRow = { id: string; created_by: string; price?: number; students_text?: string; memo?: string; start_at?: string; title?: string };

/** 추가 선생님 정보는 수업 관리에서 memo에 저장됨. memo 우선, 없으면 students_text 확인 */
function getExtraTeachersFromSession(s: { students_text?: string; memo?: string }): ExtraTeacher[] {
  for (const raw of [s.memo, s.students_text]) {
    if (!raw?.includes('EXTRA_TEACHERS:')) continue;
    try {
      const arr = JSON.parse(raw.split('EXTRA_TEACHERS:')[1].trim()) as ExtraTeacher[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      // ignore parse error
    }
  }
  return [];
}

/** 운영진(ADMIN_NAMES) — 정산 명단·수업료 합계에서 제외 */
function buildSettlementExcludedIdSet(users: { id: string; name?: string | null }[]): Set<string> {
  const names = new Set<string>(ADMIN_NAMES);
  return new Set(
    users.filter((u) => u.name && names.has(u.name)).map((u) => String(u.id))
  );
}

function isSettlementExcluded(teacherId: string, excludedIds: Set<string>): boolean {
  return excludedIds.has(String(teacherId));
}

/** 세션 1건의 지급 대상 수업료(운영진 주강사·보조 fee 제외) */
function sessionPayableFees(s: SessionRow, excludedIds: Set<string>): number {
  const mainExcluded = isSettlementExcluded(s.created_by, excludedIds);
  const rawPrice = mainExcluded ? 0 : (Number(s.price) || 0);
  const extras = getExtraTeachersFromSession(s);
  const extrasSum = extras.reduce((eSum: number, ex: ExtraTeacher) => {
    if (isSettlementExcluded(ex.id, excludedIds)) return eSum;
    return eSum + (Number(ex?.price) || 0);
  }, 0);
  return rawPrice + extrasSum;
}

function teacherSessionFee(s: SessionRow, teacherId: string, excludedIds: Set<string>): number {
  if (isSettlementExcluded(teacherId, excludedIds)) return 0;
  const isMain = String(s.created_by) === String(teacherId);
  if (isMain) return Number(s.price) || 0;
  const extras = getExtraTeachersFromSession(s);
  const ex = extras.find((e) => String(e.id) === String(teacherId));
  return Number(ex?.price) || 0;
}

type SettlementRow = { id: string; teacher_id: string; amount?: number; reason?: string };

function parseKrwInputToNumber(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

type VatCalcMode = 'supply' | 'total';

function computeVatBreakdown(mode: VatCalcMode, amount: number): { supply: number; vat: number; total: number } {
  if (mode === 'supply') {
    const vat = Math.round(amount * 0.1);
    const total = Math.round(amount + vat);
    return { supply: amount, vat, total };
  }
  const supply = Math.round(amount / 1.1);
  const vat = Math.round(amount - supply);
  return { supply, vat, total: amount };
}
type ReportTeacher = {
  id: string;
  name: string;
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

function assertSupabaseOk(error: { message: string } | null | undefined) {
  if (error) throw error;
}

function assertMutationRow<T>(
  data: T | null,
  error: { message: string } | null | undefined
): T {
  if (error) throw error;
  if (!data) throw new Error('변경이 반영되지 않았습니다. 권한 또는 RLS 정책을 확인해 주세요.');
  return data;
}

export default function UltimateSettlementPage() {
  const router = useRouter();
  const [supabase] = useState(() => (typeof window !== 'undefined' ? getSupabaseBrowserClient() : null));
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportTeacher[]>([]);
  const [sessionFeesTotal, setSessionFeesTotal] = useState(0); // 세션 수업료만 합계 (이중 합산 방지)
  const [totalAdjAmount, setTotalAdjAmount] = useState(0);   // 기타 정산 합계
  const [inputStates, setInputStates] = useState<Record<string, { amount?: string; reason?: string }>>({});

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [period, setPeriod] = useState(now.getDate() >= 16 ? 'second' : 'first');
  const [taxSummaryOpen, setTaxSummaryOpen] = useState(false);
  const [taxSummaryData, setTaxSummaryData] = useState<{ id: string; name: string; grossTotal: number; is_active?: boolean }[]>([]);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);

  const [vatCalcOpen, setVatCalcOpen] = useState(false);
  const [vatCalcMode, setVatCalcMode] = useState<VatCalcMode>('total');
  const [vatCalcInputDisplay, setVatCalcInputDisplay] = useState('');

  const vatCalcAmount = useMemo(() => parseKrwInputToNumber(vatCalcInputDisplay), [vatCalcInputDisplay]);
  const vatCalcBreakdown = useMemo(
    () => computeVatBreakdown(vatCalcMode, vatCalcAmount),
    [vatCalcMode, vatCalcAmount]
  );

  const onVatCalcInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
    if (!digits) {
      setVatCalcInputDisplay('');
      return;
    }
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 0) {
      setVatCalcInputDisplay('');
      return;
    }
    setVatCalcInputDisplay(n.toLocaleString('ko-KR'));
  }, []);

  useEffect(() => {
    const checkMaster = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
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
    setLoading(true);
    try {
      const now = new Date();
      const lastDay = new Date(year, month, 0).getDate();
      const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
      const todayDay = now.getDate();

      let startDay = period === 'first' ? 1 : 16;
      let endDay = period === 'first' ? 15 : lastDay;
      if (isCurrentMonth) {
        if (period === 'second' && todayDay < 16) {
          endDay = 15;
        } else {
          endDay = Math.min(endDay, todayDay);
        }
      }
      const startDate = `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const [{ data: teachers, error: teachersError }, { data: opsUsers, error: opsUsersError }] = await Promise.all([
        supabase
          .from('users')
          .select('id, name')
          .eq('role', 'teacher')
          .eq('is_active', true),
        supabase.from('users').select('id, name').in('name', [...ADMIN_NAMES]),
      ]);
      assertSupabaseOk(teachersError);
      assertSupabaseOk(opsUsersError);
      const excludedIds = buildSettlementExcludedIdSet(opsUsers || []);
      const teachersFiltered = (teachers || []).filter((t: TeacherRow) => !isSettlementExcluded(t.id, excludedIds));

      // 정산 대상: finished + verified (검수 승인 포함). 강사 앱·진단 SQL과 동일 기준.
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, created_by, price, students_text, memo, start_at, title')
        .in('status', ['finished', 'verified'])
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`);
      assertSupabaseOk(sessionsError);

      const { data: dbAdjs, error: dbAdjsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('year', year).eq('month', month).eq('period', period);
      assertSupabaseOk(dbAdjsError);

      // 수업료 총합(지급액): 세션의 price는 주강사 지급액, EXTRA_TEACHERS 각 price는 보조 지급액 → 세션별 주+보조 합산
      const sessionsList = sessions || [];
      const rawSessionFees = sessionsList.reduce(
        (sum: number, s: SessionRow) => sum + sessionPayableFees(s, excludedIds),
        0
      );
      const rawAdjTotal = (dbAdjs || []).reduce((acc: number, cur: SettlementRow) => {
        if (isSettlementExcluded(cur.teacher_id, excludedIds)) return acc;
        return acc + (Number(cur?.amount) ?? 0);
      }, 0);
      setSessionFeesTotal(rawSessionFees);
      setTotalAdjAmount(rawAdjTotal);

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
          count: teacherSessions.length,
          grossTotal: grossTotal || 0,
          tax: tax || 0,
          netPay: netPay || 0,
          details: detailsByDate,
          adjs: teacherAdjs
        };
      })
      .sort((a: { netPay: number; name: string }, b: { netPay: number; name: string }) => b.netPay - a.netPay || a.name.localeCompare(b.name, 'ko'));

      setReportData(calculatedData);
    } catch (error) {
      devLogger.error('Data load error:', error);
      toast.error(error instanceof Error ? error.message : '정산 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [supabase, isAdmin, year, month, period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  /** 세금 계산용: 선택한 연·월 한 달 전체(1일~말일) 기준 선생님별 세전 총액 */
  const fetchTaxSummary = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    setTaxSummaryLoading(true);
    setTaxSummaryOpen(true);
    try {
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [{ data: teachers, error: teachersError }, { data: opsUsers, error: opsUsersError }] = await Promise.all([
        supabase.from('users').select('id, name, is_active').eq('role', 'teacher'),
        supabase.from('users').select('id, name').in('name', [...ADMIN_NAMES]),
      ]);
      assertSupabaseOk(teachersError);
      assertSupabaseOk(opsUsersError);
      const excludedIds = buildSettlementExcludedIdSet(opsUsers || []);
      const teachersFiltered = (teachers || []).filter(
        (t: TeacherRow & { is_active?: boolean }) => !isSettlementExcluded(t.id, excludedIds)
      );

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, created_by, price, students_text, memo')
        .in('status', ['finished', 'verified'])
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`);
      assertSupabaseOk(sessionsError);

      const { data: dbAdjs, error: dbAdjsError } = await supabase
        .from('settlements')
        .select('*')
        .eq('year', year)
        .eq('month', month);
      assertSupabaseOk(dbAdjsError);

      const sessionsList = sessions || [];
      const calculated = teachersFiltered.map((teacher: TeacherRow & { is_active?: boolean }) => {
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
        return { id: teacher.id, name: teacher.name || 'Unknown', grossTotal, is_active: teacher.is_active ?? true };
      });
      setTaxSummaryData(
        calculated.sort(
          (a: { grossTotal: number; name: string }, b: { grossTotal: number; name: string }) =>
            b.grossTotal - a.grossTotal || a.name.localeCompare(b.name, 'ko')
        )
      );
    } catch (e) {
      devLogger.error('Tax summary error:', e);
      toast.error('세금 계산용 데이터 조회 실패');
    } finally {
      setTaxSummaryLoading(false);
    }
  }, [supabase, isAdmin, year, month]);

  // 대시보드 합계: Total Gross = 세션 수업료 + 기타정산 (단일 기준). Net/Tax는 여기서 파생해 상단 카드가 항상 일치하도록 함
  const totalGrossFromSessions = sessionFeesTotal + totalAdjAmount;
  const derivedTax = Math.floor(totalGrossFromSessions * 0.033);
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
      ctx.fillText(`${teacher.name} T 정산 내역`, left, 72);
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

  const taxSummaryNonZero = taxSummaryData.filter((row) => (row.grossTotal || 0) !== 0);
  const taxSummaryZeroOnly = taxSummaryData.filter((row) => (row.grossTotal || 0) === 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-32 pt-10 font-sans">
      
      {/* 상단 헤더 & 필터 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Payroll</h1>
          <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-[0.3em]">Master Settlement Dashboard</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={fetchTaxSummary}
            disabled={taxSummaryLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-2xl text-xs font-black uppercase tracking-wide transition-all shadow-sm border border-amber-600/30"
          >
            <FileText size={14} />
            {taxSummaryLoading ? '조회 중…' : '세금 계산용 (월별 세전)'}
          </button>
          <button
            type="button"
            onClick={() => setVatCalcOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wide transition-all shadow-sm border border-indigo-700/30"
          >
            <Calculator size={14} />
            부가세 계산기
          </button>
          <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-slate-100 gap-2 items-center">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="p-2 text-slate-400 outline-none bg-transparent cursor-pointer text-xs font-black uppercase">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}Y</option>)}
          </select>
          <div className="w-[1px] h-3 bg-slate-100 mx-1"></div>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="p-2 text-indigo-600 outline-none bg-transparent cursor-pointer text-xs font-black">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
            <button onClick={() => setPeriod('first')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${period === 'first' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>1-15일</button>
            <button onClick={() => setPeriod('second')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${period === 'second' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>16-말일</button>
          </div>
        </div>
        </div>
      </div>

      {/* 세금 계산용: 선생님별 해당 월 세전 총액 */}
      {taxSummaryOpen && (
        <section className="mb-10 bg-amber-50/80 border border-amber-200/60 rounded-[28px] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-amber-900 uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} /> {year}년 {month}월 세금 계산용 — 선생님별 세전 총액 (한 달 전체)
            </h2>
            <button type="button" onClick={() => setTaxSummaryOpen(false)} className="text-amber-600 hover:text-amber-800 text-xs font-black">닫기</button>
          </div>
          {taxSummaryLoading ? (
            <p className="text-amber-700 text-xs font-bold">불러오는 중…</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-200/60">
                      <th className="py-3 px-2 text-[10px] font-black text-amber-800 uppercase tracking-wider">선생님</th>
                      <th className="py-3 px-2 text-[10px] font-black text-amber-800 uppercase tracking-wider text-right">세전 총액 (원)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxSummaryNonZero.map((row) => (
                      <tr key={row.id} className="border-b border-amber-100/60 last:border-0">
                        <td className="py-2.5 px-2 text-sm font-bold text-slate-800">
                          {row.name}
                          {row.is_active === false && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(종료)</span>}
                        </td>
                        <td className="py-2.5 px-2 text-sm font-black text-slate-900 text-right">{(row.grossTotal || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {taxSummaryZeroOnly.length > 0 && (
                <details className="rounded-2xl border border-amber-200/50 bg-white/60 overflow-hidden group">
                  <summary className="cursor-pointer list-none py-3 px-3 text-xs font-black text-amber-900 uppercase tracking-wide flex items-center justify-between gap-2 select-none hover:bg-amber-100/40 [&::-webkit-details-marker]:hidden">
                    <span>세전 0원 선생님 ({taxSummaryZeroOnly.length}명)</span>
                    <span className="text-[10px] font-bold text-amber-600/80 shrink-0">펼치기 · 접기</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-amber-100/80">
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        {taxSummaryZeroOnly.map((row) => (
                          <tr key={row.id} className="border-b border-amber-100/40 last:border-0">
                            <td className="py-2 px-3 text-sm font-bold text-slate-600">
                              {row.name}
                              {row.is_active === false && <span className="ml-1.5 text-[10px] font-bold text-slate-400">(종료)</span>}
                            </td>
                            <td className="py-2 px-3 text-sm font-bold text-slate-500 text-right">0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      )}

      {/* [ Image of Monthly Settlement Summary Dashboard ] */}
      {/* 1. 월별 정산 총합 대시보드 (Total Summary) */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 rounded-[32px] p-8 text-white shadow-2xl md:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={80}/></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><CreditCard size={14}/> Total Net Payout</p>
          <p className="text-4xl font-black italic text-blue-400 tracking-tighter">
            {(stats.totalNet || 0).toLocaleString()}
            <span className="text-sm ml-2 not-italic text-white opacity-40">KRW</span>
          </p>
          <div className="mt-6 flex items-center gap-4 text-[11px] font-black text-slate-400">
            <span className="flex items-center gap-1.5"><Users size={12}/> {stats.activeCount} Active</span>
            <span className="opacity-20">|</span>
            <span>Tax Total: {(stats.totalTax || 0).toLocaleString()}원</span>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Calculator size={14}/> 3.3% Tax</p>
          <p className="text-2xl font-black text-red-500 italic tracking-tighter">
            {(stats.totalTax || 0).toLocaleString()}
            <span className="text-xs ml-1 not-italic text-slate-300">원</span>
          </p>
        </div>
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic text-indigo-600">Total Gross</p>
          <p className="text-2xl font-black text-slate-800 italic tracking-tighter">
            {(stats.totalGross || 0).toLocaleString()}
            <span className="text-xs ml-1 not-italic text-slate-300">원</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 space-y-1">
            <p>수업료: {(stats.sessionFeesTotal ?? 0).toLocaleString()}원</p>
            <p className={stats.totalAdjAmount >= 0 ? 'text-slate-500' : 'text-red-500'}>기타 정산: {stats.totalAdjAmount >= 0 ? '+' : ''}{(stats.totalAdjAmount ?? 0).toLocaleString()}원</p>
          </div>
        </div>
      </section>

      {/* 2. 강사별 정산 리스트 (0원 포함) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {reportData.map((teacher: ReportTeacher) => (
          <div key={teacher.id} className="group flex flex-col gap-2">
            <div 
              onClick={() => setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id)} 
              className={`bg-white rounded-[28px] border p-5 flex justify-between items-center transition-all cursor-pointer shadow-sm ${
                expandedTeacher === teacher.id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-50 hover:border-indigo-100'
              } ${teacher.netPay === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${teacher.netPay > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {teacher.name.slice(0, 1)}
                </div>
                <div className="font-black">
                  <h3 className="text-[15px] text-slate-900 leading-tight">{teacher.name} T</h3>
                  <p className="text-[9px] text-slate-300 uppercase tracking-widest">{teacher.count} Sessions</p>
                </div>
              </div>
              <div className="text-right font-black">
                <p className={`text-xl italic tracking-tighter ${teacher.netPay > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                  {(teacher.netPay || 0).toLocaleString()}<span className="text-[10px] ml-1 not-italic">원</span>
                </p>
                <p className="text-[8px] text-slate-400 font-bold not-italic mt-0.5">실수령액</p>
              </div>
            </div>

            {expandedTeacher === teacher.id && (
              <div className="bg-white rounded-[32px] border-2 border-indigo-600 p-6 space-y-6 animate-in fade-in slide-in-from-top-2 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <div className="flex gap-4 font-black text-[10px] text-slate-400 uppercase">
                    <span>Gross: {(teacher.grossTotal || 0).toLocaleString()}원</span>
                    <span className="text-red-400">Tax: {(teacher.tax || 0).toLocaleString()}원</span>
                  </div>
                  <button onClick={() => downloadImage(teacher)} className="text-[9px] font-black px-4 py-2 border border-slate-200 rounded-full hover:bg-black hover:text-white transition-all flex items-center gap-2"><Download size={12}/> RECEIPT</button>
                </div>

                <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                  <div className="flex gap-2">
                    <input type="number" placeholder="금액" value={inputStates[teacher.id]?.amount || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], amount: e.target.value}})} className="w-24 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                    <input type="text" placeholder="기타 정산 사유" value={inputStates[teacher.id]?.reason || ''} onChange={(e) => setInputStates({...inputStates, [teacher.id]: {...inputStates[teacher.id], reason: e.target.value}})} className="flex-1 bg-white rounded-xl p-3 text-xs font-black outline-none border border-slate-100" />
                  </div>
                  <button onClick={() => addAdjItem(teacher.id)} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-black hover:bg-black transition-all">정산 항목 추가</button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2 mb-2"><History size={10} className="inline mr-1"/> Activity Details</p>
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
                    <div className="py-10 text-center text-slate-200 text-[9px] font-black uppercase italic">No activity record for this period</div>
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
          <h4 className="text-xs font-black text-blue-900 uppercase tracking-tight mb-1">Settlement Policy Notice</h4>
          <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
            모든 강사료는 프리랜서 사업소득(3.3%) 원천징수 후 지급됩니다. 활동이 없는 강사님도 누락 방지를 위해 명단에 포함되어 있으며, 최종 지급액이 0원인 경우 별도의 명세서가 발행되지 않습니다.
          </p>
        </div>
      </div>

      {vatCalcOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vat-calc-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={() => setVatCalcOpen(false)}
            aria-label="부가세 계산기 닫기"
          />
          <div className="relative w-full max-w-lg rounded-[28px] bg-white shadow-2xl border border-slate-200/90 p-6 md:p-8 max-h-[min(90vh,640px)] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 id="vat-calc-title" className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  부가세 계산기
                </h2>
                <p className="mt-1 text-[11px] font-bold text-slate-500 leading-relaxed">
                  부가세 10% 기준 · 원 단위 반올림 (합계 역산 시 공급가액 = 합계 ÷ 1.1)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVatCalcOpen(false)}
                className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="닫기"
              >
                <X size={22} strokeWidth={2.25} />
              </button>
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">입력 기준</p>
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 mb-5">
              <button
                type="button"
                onClick={() => setVatCalcMode('supply')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all ${
                  vatCalcMode === 'supply'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                공급가액 (세전)
              </button>
              <button
                type="button"
                onClick={() => setVatCalcMode('total')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all ${
                  vatCalcMode === 'total'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                합계금액 (공급대가)
              </button>
            </div>

            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              {vatCalcMode === 'supply' ? '공급가액 (원)' : '합계금액 (원)'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="금액 입력"
              value={vatCalcInputDisplay}
              onChange={onVatCalcInputChange}
              className="w-full text-2xl md:text-3xl font-black text-slate-900 tracking-tight px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-shadow"
            />

            <div className="mt-8 grid gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">공급가액</p>
                <p className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums tracking-tighter">
                  {vatCalcBreakdown.supply.toLocaleString()}
                  <span className="text-lg md:text-xl font-bold text-slate-400 ml-1">원</span>
                </p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                <p className="text-[10px] font-black text-amber-800/70 uppercase tracking-widest mb-1">부가세 (10%)</p>
                <p className="text-3xl md:text-4xl font-black text-amber-900 tabular-nums tracking-tighter">
                  {vatCalcBreakdown.vat.toLocaleString()}
                  <span className="text-lg md:text-xl font-bold text-amber-700/60 ml-1">원</span>
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
                <p className="text-[10px] font-black text-indigo-800/70 uppercase tracking-widest mb-1">합계금액</p>
                <p className="text-3xl md:text-4xl font-black text-indigo-950 tabular-nums tracking-tighter">
                  {vatCalcBreakdown.total.toLocaleString()}
                  <span className="text-lg md:text-xl font-bold text-indigo-400 ml-1">원</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
