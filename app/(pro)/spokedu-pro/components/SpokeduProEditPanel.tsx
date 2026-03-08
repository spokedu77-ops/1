'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileEdit, Download, Video, FileText } from 'lucide-react';
import { useSpokeduProAdminBlocks, type BlockEntry } from '../hooks/useSpokeduProContent';
import type { ProgramDetail } from '../types';

export type { ProgramDetail };

/** 프로그램 상세: 영상 링크 + 상세설명 폼. 저장 시 곧바로 구독자에게 반영됨 */
function ProgramDetailForm({
  content,
  saving,
  onSaveContent,
  onToast,
}: {
  content: Record<string, BlockEntry>;
  saving: boolean;
  onSaveContent: (key: string, value: unknown, version: number) => Promise<void>;
  onToast?: (msg: string) => void;
}) {
  const entry = content['program_details'];
  const draft = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
  const version = entry?.version ?? 0;

  const [programId, setProgramId] = useState<string>('1');
  const [videoUrl, setVideoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [targetBrain, setTargetBrain] = useState('');
  const [targetPhysic, setTargetPhysic] = useState('');
  const [tool, setTool] = useState('');
  const [setupGuideText, setSetupGuideText] = useState('');

  useEffect(() => {
    const id = programId.trim() || '1';
    const d = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
    const cur = d[id];
    if (cur) {
      setVideoUrl(cur.videoUrl ?? '');
      setDescription(cur.description ?? '');
      setTitle(cur.title ?? '');
      setTargetBrain(cur.targetBrain ?? '');
      setTargetPhysic(cur.targetPhysic ?? '');
      setTool(cur.tool ?? '');
      setSetupGuideText(cur.setupGuideText ?? '');
    } else {
      setVideoUrl('');
      setDescription('');
      setTitle('');
      setTargetBrain('');
      setTargetPhysic('');
      setTool('');
      setSetupGuideText('');
    }
  }, [programId, entry]);

  const handleSave = useCallback(async () => {
    const id = programId.trim() || '1';
    const next: Record<string, ProgramDetail> = { ...draft };
    next[id] = {
      videoUrl: videoUrl.trim() || undefined,
      description: description.trim() || undefined,
      title: title.trim() || undefined,
      targetBrain: targetBrain.trim() || undefined,
      targetPhysic: targetPhysic.trim() || undefined,
      tool: tool.trim() || undefined,
      setupGuideText: setupGuideText.trim() || undefined,
    };
    await onSaveContent('program_details', next, version);
    onToast?.('저장되었습니다. 구독자에게 바로 반영됩니다.');
  }, [programId, videoUrl, description, title, targetBrain, targetPhysic, tool, setupGuideText, draft, version, onSaveContent, onToast]);

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-600 p-4 space-y-4">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Video className="w-4 h-4 text-blue-400" />
        프로그램 상세 (영상 링크 · 상세설명)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">프로그램 ID</label>
          <input
            type="number"
            min={1}
            max={100}
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 mb-1">영상 링크 (URL)</label>
          <input
            type="url"
            placeholder="https://www.youtube.com/embed/... 또는 동영상 URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">상세설명 (소개 문단)</label>
          <textarea
            placeholder="복잡한 센서 장비 없이, 체육관 스크린이나 태블릿 화면과 기본 교구만으로..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">제목 (선택)</label>
          <input
            type="text"
            placeholder="예: 인지결합 컬러 마커런"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">TARGET BRAIN (인지 인코딩)</label>
          <input
            type="text"
            placeholder="운동피질 (대근육 협응)"
            value={targetBrain}
            onChange={(e) => setTargetBrain(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">PHYSICAL COMPONENT (신체 수행)</label>
          <input
            type="text"
            placeholder="순발력 및 민첩성"
            value={targetPhysic}
            onChange={(e) => setTargetPhysic(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">최소 준비물</label>
          <input
            type="text"
            placeholder="컬러 마커, 스마트 모니터"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">로우 허들 셋업 가이드 문구</label>
          <textarea
            placeholder="비싼 장비는 필요 없습니다. 체육관에 마커를 깔고..."
            value={setupGuideText}
            onChange={(e) => setSetupGuideText(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg cursor-pointer flex items-center gap-2"
      >
        <FileText className="w-4 h-4" />
        {saving ? '저장 중…' : '저장'}
      </button>
    </div>
  );
}

export default function SpokeduProEditPanel({ onToast }: { onToast?: (msg: string) => void }) {
  const [open, setOpen] = useState(true);
  const {
    content,
    loading,
    error,
    saving,
    fetchBlocks,
    saveContentDraft,
  } = useSpokeduProAdminBlocks();

  const handleSaveContent = useCallback(
    async (key: string, value: unknown, version: number) => {
      const result = await saveContentDraft(key, value, version);
      if (!result.ok) onToast?.('저장 실패: ' + (error ?? ''));
    },
    [saveContentDraft, onToast, error]
  );

  return (
    <div className="border-t border-slate-700 bg-slate-900/95">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-white font-bold cursor-pointer hover:bg-slate-800/80"
      >
        <span className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-blue-400" />
          편집
        </span>
        <span className="text-slate-400 text-sm">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-sm text-red-300">{error}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchBlocks}
              disabled={loading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-bold rounded-lg flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {loading ? '불러오는 중…' : '불러오기'}
            </button>
          </div>
          <ProgramDetailForm
            content={content}
            saving={saving}
            onSaveContent={handleSaveContent}
            onToast={onToast}
          />
        </div>
      )}
    </div>
  );
}
