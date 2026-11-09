'use client';

import { useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { loadXlsx } from './settlementXlsx';
import styles from './TeacherSettlementReport.module.css';

export type MonthlySettlementRow = { id: string; name: string; grossTotal: number; sessionsTotal: number; adjTotal: number; count: number; is_active?: boolean };

export default function MonthlySettlementSummary({ year, month, rows, loading, error, onRefresh }: {
  year: number; month: number; rows: MonthlySettlementRow[]; loading: boolean; error: boolean; onRefresh: () => void;
}) {
  const [query, setQuery] = useState('');
  const [includeZero, setIncludeZero] = useState(false);
  const [sort, setSort] = useState('name');
  const [exporting, setExporting] = useState(false);
  const visible = rows.filter((row) => (includeZero || row.grossTotal !== 0) && row.name.includes(query.trim()))
    .sort((a, b) => sort === 'amount' ? b.grossTotal - a.grossTotal || a.name.localeCompare(b.name, 'ko') : a.name.localeCompare(b.name, 'ko'));
  const total = rows.reduce((sum, row) => sum + row.grossTotal, 0);
  const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
  const download = async () => {
    if (loading || error || exporting) return;
    setExporting(true);
    try {
      const xlsx = await loadXlsx();
      const workbook = xlsx.utils.book_new();
      const data: unknown[][] = [
        [`${year}년 ${month}월 월별 세전 내역`], ['월 전체 · 완료·검수 완료 수업 및 기타 정산 · 원천징수 전 금액'],
        ['강사명', '활동 상태', '회기', '수업료', '기타 정산', '세전 합계'],
        ...visible.map((row) => [row.name, row.is_active === false ? '종료' : '활동', row.count, row.sessionsTotal, row.adjTotal, row.grossTotal]),
        ['조회 결과 합계', '', visible.reduce((sum, row) => sum + row.count, 0), ...(['sessionsTotal', 'adjTotal', 'grossTotal'] as const).map((key) => visible.reduce((sum, row) => sum + row[key], 0))],
      ];
      const sheet = xlsx.utils.aoa_to_sheet(data);
      sheet['!cols'] = [22, 12, 10, 20, 20, 20].map((wch) => ({ wch }));
      for (let r = 3; r < data.length; r++) for (const c of [3, 4, 5]) {
        const cell = sheet[`${xlsx.utils.encode_col(c)}${r + 1}`] as { z?: string } | undefined;
        if (cell) cell.z = '#,##0"원"';
      }
      xlsx.utils.book_append_sheet(workbook, sheet, '월별 세전 내역');
      xlsx.writeFile(workbook, `월별세전내역_${year}-${String(month).padStart(2, '0')}.xlsx`);
    } catch {
      toast.error('엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.');
    } finally { setExporting(false); }
  };
  return <section aria-label="월별 세전 내역">
    <div className={styles.monthlyHeader}>
      <div><h2>{year}년 {month}월 세전 내역</h2><p>1일~말일 전체 · 완료·검수 완료 수업 + 기타 정산 · 원천징수 전 금액</p></div>
      <div className={styles.tools}>
        <button type="button" className={styles.taxButton} onClick={onRefresh} disabled={loading}><RefreshCw size={14} />새로고침</button>
        <button type="button" className={styles.taxButton} onClick={download} disabled={loading || error || exporting}><Download size={14} />{exporting ? '생성 중…' : '조회 결과 엑셀'}</button>
      </div>
    </div>
    {loading ? <p role="status" className="py-6 text-sm text-slate-500">월별 내역을 불러오는 중입니다.</p> : error ? <p role="alert" className="py-6 text-sm text-red-600">월별 내역을 불러오지 못했습니다. 새로고침으로 다시 조회해 주세요.</p> : <>
      <div className={styles.monthlyTotal}><span>월 전체 세전 합계<strong>{money(total)}</strong></span><span>세전 금액이 있는 강사 <b>{rows.filter((row) => row.grossTotal !== 0).length}명</b></span></div>
      <div className={styles.monthlyFilters}>
        <label className={styles.search}><Search size={16} /><input aria-label="강사명 검색" placeholder="강사명 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="월별 내역 정렬" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">가나다순</option><option value="amount">금액 높은순</option></select>
        <label className={styles.zeroFilter}><input type="checkbox" checked={includeZero} onChange={(event) => setIncludeZero(event.target.checked)} />0원 포함</label>
        <span className="text-xs text-slate-500">{visible.length}명 표시</span>
      </div>
      <div className={styles.monthlyTableWrap}><table className={styles.monthlyTable}>
        <thead><tr><th>강사명</th><th>회기</th><th>수업료</th><th>기타 정산</th><th>세전 합계</th></tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id}><th scope="row">{row.name}{row.is_active === false && <small>종료</small>}</th><td>{row.count}회</td><td>{money(row.sessionsTotal)}</td><td>{money(row.adjTotal)}</td><td><strong>{money(row.grossTotal)}</strong></td></tr>)}
          {!visible.length && <tr><td colSpan={5} className="text-center">조건에 맞는 내역이 없습니다.</td></tr>}
        </tbody>
        {!!visible.length && <tfoot><tr><th>조회 결과 합계</th><td>{visible.reduce((sum, row) => sum + row.count, 0)}회</td><td>{money(visible.reduce((sum, row) => sum + row.sessionsTotal, 0))}</td><td>{money(visible.reduce((sum, row) => sum + row.adjTotal, 0))}</td><td>{money(visible.reduce((sum, row) => sum + row.grossTotal, 0))}</td></tr></tfoot>}
      </table></div>
    </>}
  </section>;
}
