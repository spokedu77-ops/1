'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Upload, ArrowLeft, FileSpreadsheet, CheckCircle, XCircle, MonitorPlay } from 'lucide-react';

const CSV_HEADERS = ['mode_id', 'title', 'subtitle', 'description', 'sort_order', 'preset_ref', 'thumbnail_url'];
const VALID_MODE_IDS = ['CHALLENGE', 'FLOW', '반응인지', '순차기억', '스트룹', '이중과제'];

export default function AdminScreenplayUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    total: number;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      header.forEach((h, j) => { row[h] = values[j] ?? ''; });
      return row;
    });
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    const text = await f.text();
    const rows = parseCsv(text);
    setPreviewRows(rows.slice(0, 15));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/spokedu-pro/screenplays/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.details?.slice(0, 5).join('\n') ?? '';
        setError((data.error ?? '업로드 실패') + (detail ? '\n' + detail : ''));
      } else {
        setResult({ imported: data.imported, total: data.total, message: data.message });
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const previewHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : CSV_HEADERS;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-10 space-y-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/spokedu-pro"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 관리자 홈
        </Link>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-2 text-white font-bold">
          <MonitorPlay className="w-5 h-5 text-orange-400" />
          스크린플레이 72개 일괄 업로드
        </div>
      </div>

      {/* 포맷 안내 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          CSV 포맷 (UTF-8)
        </p>
        <p className="text-xs text-slate-500 font-mono bg-slate-900 px-3 py-2 rounded-lg">
          {CSV_HEADERS.join(', ')}
        </p>
        <div className="text-xs text-slate-500 space-y-1">
          <p><span className="text-orange-400 font-bold">mode_id</span> — 허용값: {VALID_MODE_IDS.join(', ')}</p>
          <p><span className="text-slate-400 font-bold">title</span> — 스크린플레이 제목 (필수)</p>
          <p><span className="text-slate-400 font-bold">subtitle</span> — 부제목 (선택)</p>
          <p><span className="text-slate-400 font-bold">description</span> — 설명 (선택)</p>
          <p><span className="text-slate-400 font-bold">sort_order</span> — 정렬 순서 숫자 (선택)</p>
          <p>업로드 후 <code className="bg-slate-800 px-1 rounded">is_published=false</code>로 저장. DB에서 직접 true로 변경하세요.</p>
        </div>
      </div>

      {/* 드래그 앤 드롭 */}
      <div
        className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 rounded-2xl p-10 text-center transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById('screenplay-file-input')?.click()}
      >
        <input
          id="screenplay-file-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        {file ? (
          <div className="space-y-1">
            <p className="text-white font-bold">{file.name}</p>
            <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB · {previewRows.length}행 미리보기</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-400 text-sm font-medium">CSV 파일을 드래그하거나 클릭해서 선택</p>
            <p className="text-slate-600 text-xs">스크린플레이 72개 · .csv</p>
          </div>
        )}
      </div>

      {/* 미리보기 테이블 */}
      {previewRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            미리보기 (최대 15행)
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="text-xs w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  {previewHeaders.map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                    {previewHeaders.map((h) => (
                      <td key={h} className="px-3 py-2 text-slate-300 max-w-[200px] truncate">
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="flex items-start gap-3 px-5 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 font-bold">{result.imported}/{result.total}개 임포트 완료</p>
            <p className="text-emerald-400/70 text-sm mt-0.5">{result.message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold">업로드 실패</p>
            <pre className="text-red-400/70 text-xs mt-1 whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {/* 업로드 버튼 */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            DB에 반영
          </>
        )}
      </button>
    </div>
  );
}
