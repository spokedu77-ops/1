'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileEdit, Download, Video, FileText } from 'lucide-react';
import { useSpokeduProAdminBlocks, type BlockEntry } from '../hooks/useSpokeduProContent';
import type { ProgramDetail } from '../types';
import { FUNCTION_TYPES, MAIN_THEMES, GROUP_SIZES } from '@/app/lib/spokedu-pro/programClassification';

export type { ProgramDetail };

/** 프로그램 상세: 새 분류(기능·테마·인원) + 영상·체크리스트·교구·활동방법·팁 */
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
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [functionType, setFunctionType] = useState('');
  const [mainTheme, setMainTheme] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [checklist, setChecklist] = useState('');
  const [equipment, setEquipment] = useState('');
  const [activityMethod, setActivityMethod] = useState('');
  const [activityTip, setActivityTip] = useState('');

  useEffect(() => {
    const id = programId.trim() || '1';
    const d = (entry?.draft_value ?? {}) as Record<string, ProgramDetail>;
    const cur = d[id];
    if (cur) {
      setTitle(cur.title ?? '');
      setVideoUrl(cur.videoUrl ?? '');
      setFunctionType(cur.functionType ?? '');
      setMainTheme(cur.mainTheme ?? '');
      setGroupSize(cur.groupSize ?? '');
      setChecklist(cur.checklist ?? '');
      setEquipment(cur.equipment ?? '');
      setActivityMethod(cur.activityMethod ?? '');
      setActivityTip(cur.activityTip ?? '');
    } else {
      setTitle('');
      setVideoUrl('');
      setFunctionType('');
      setMainTheme('');
      setGroupSize('');
      setChecklist('');
      setEquipment('');
      setActivityMethod('');
      setActivityTip('');
    }
  }, [programId, entry]);

  const handleSave = useCallback(async () => {
    const id = programId.trim() || '1';
    const next: Record<string, ProgramDetail> = { ...draft };
    next[id] = {
      title: title.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      functionType: functionType.trim() || undefined,
      mainTheme: mainTheme.trim() || undefined,
      groupSize: groupSize.trim() || undefined,
      checklist: checklist.trim() || undefined,
      equipment: equipment.trim() || undefined,
      activityMethod: activityMethod.trim() || undefined,
      activityTip: activityTip.trim() || undefined,
    };
    await onSaveContent('program_details', next, version);
    onToast?.('저장되었습니다.');
  }, [programId, title, videoUrl, functionType, mainTheme, groupSize, checklist, equipment, activityMethod, activityTip, draft, version, onSaveContent, onToast]);

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-600 p-4 space-y-4">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Video className="w-4 h-4 text-blue-400" />
        프로그램 상세 (기능·테마·인원 · 영상 · 체크리스트 · 교구 · 활동방법 · 팁)
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">프로그램 ID</label>
          <input
            type="number"
            min={1}
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-400 mb-1">제목</label>
          <input
            type="text"
            placeholder="프로그램 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">YouTube URL</label>
          <input
            type="url"
            placeholder="https://youtube.com/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">기능 종류</label>
          <select
            value={functionType}
            onChange={(e) => setFunctionType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">선택</option>
            {FUNCTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">메인테마</label>
          <select
            value={mainTheme}
            onChange={(e) => setMainTheme(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">선택</option>
            {MAIN_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1">인원구성</label>
          <select
            value={groupSize}
            onChange={(e) => setGroupSize(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">선택</option>
            {GROUP_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">사전 체크리스트</label>
          <textarea
            placeholder="진행 전 확인할 항목"
            value={checklist}
            onChange={(e) => setChecklist(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">필요 교구리스트</label>
          <input
            type="text"
            placeholder="준비할 교구"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">활동방법</label>
          <textarea
            placeholder="진행 방법"
            value={activityMethod}
            onChange={(e) => setActivityMethod(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-400 mb-1">활동 팁</label>
          <textarea
            placeholder="활동 시 팁"
            value={activityTip}
            onChange={(e) => setActivityTip(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg cursor-pointer flex items-center gap-2"
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
