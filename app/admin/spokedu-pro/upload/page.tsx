'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Upload, ArrowLeft, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';

/**
 * 스포키듀 구독 — 프로그램 144개 CSV/엑셀 일괄 업로드.
 * 미리보기 테이블 → 반영 버튼 → 결과 토스트.
 */
export default function AdminSpokeduProUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; total: number; errors?: { row: number; message: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map((h) => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      header.forEach((h, j) => {
        row[h] = values[j] ?? '';
      });
      rows.push(row);
    }
    return rows;
  };

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setResult(null);
    setError(null);
    if (!f) {
      setPreviewRows([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseCsv(text);
      setPreviewRows(rows.slice(0, 15));
    };
    reader.readAsText(f, 'UTF-8');
  }, []);

  const onImport = async () => {
    if (!file) {
      setError('파일을 선택하세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/spokedu-pro/programs/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? res.statusText ?? '임포트 실패');
        setLoading(false);
        return;
      }
      setResult({
        success: data.success ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
        errors: data.errors,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-900 text-white p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/spokedu-pro"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> 스포키듀 구독 Admin
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-black tracking-tight mb-2">프로그램 144개 일괄 업로드</h1>
        <p className="text-slate-400 text-sm mb-3">
          CSV 또는 엑셀(CSV로 저장) 후 업로드. 분류는 기능 종류·메인테마·인원구성입니다.
        </p>
        <ul className="text-slate-500 text-xs font-medium space-y-1 list-disc list-inside">
          <li><strong className="text-slate-400">id</strong> 고유 번호 (선택, 있으면 수정)</li>
          <li><strong className="text-slate-400">title</strong> 프로그램 제목</li>
          <li><strong className="text-slate-400">function_type</strong> 순발력, 민첩성, 리듬감, 유연성, 협응력, 심폐지구력, 근지구력</li>
          <li><strong className="text-slate-400">main_theme</strong> 육상놀이체육, 협동형, 경쟁형, 도전형, 태그형</li>
          <li><strong className="text-slate-400">group_size</strong> 개인, 짝꿍, 소그룹, 대그룹</li>
          <li><strong className="text-slate-400">video_url</strong> 유튜브 영상 주소</li>
          <li><strong className="text-slate-400">checklist</strong> 사전 체크리스트</li>
          <li><strong className="text-slate-400">equipment</strong> 필요 교구리스트</li>
          <li><strong className="text-slate-400">activity_method</strong> 활동방법</li>
          <li><strong className="text-slate-400">activity_tip</strong> 활동 팁</li>
        </ul>
      </header>

      <div className="flex flex-col gap-4 max-w-2xl mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-slate-400" />
          </div>
          <div className="flex-1">
            <span className="font-bold text-sm">파일 선택</span>
            <p className="text-slate-500 text-xs">{file ? file.name : 'CSV 또는 엑셀(CSV 저장)'}</p>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={onFileChange}
            className="hidden"
          />
        </label>

        {previewRows.length > 0 && (
          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <p className="bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400">
              미리보기 (최대 15행) · 총 {previewRows.length}행
            </p>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/80 sticky top-0">
                  <tr>
                    {Object.keys(previewRows[0] ?? {}).map((k) => (
                      <th key={k} className="px-3 py-2 font-bold text-slate-300 whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-700/80">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-slate-300 max-w-[200px] truncate" title={v}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onImport}
          disabled={!file || loading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>처리 중...</>
          ) : (
            <>
              <Upload className="w-5 h-5" /> 반영
            </>
          )}
        </button>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-sm">
            <XCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">반영 완료: {result.success}건 성공, {result.failed}건 실패 (총 {result.total}건)</span>
            </div>
            {result.errors && result.errors.length > 0 && (
              <ul className="list-disc list-inside text-slate-400 text-xs space-y-1 mt-2">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>행 {e.row}: {e.message}</li>
                ))}
                {result.errors.length > 10 && <li>… 외 {result.errors.length - 10}건</li>}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-slate-500 text-xs">
        function_type·main_theme·group_size는 정해진 값만 입력. 템플릿: docs/programs-144-template.csv
      </p>
    </div>
  );
}
