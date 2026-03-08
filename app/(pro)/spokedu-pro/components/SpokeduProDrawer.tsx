'use client';

import { useState, useEffect } from 'react';
import { X, CheckSquare, Box, ListOrdered, Sparkles, Edit2, FileText } from 'lucide-react';
import type { ProgramDetail } from '../types';

const MOCK_PROGRAM = {
  title: '스포키듀 추천 커리큘럼',
  targetBrain: '운동피질 (대근육 협응)',
  targetPhysic: '순발력 및 민첩성',
  tool: '컬러 마커, 스마트 모니터',
};

const DEFAULT_DESCRIPTION =
  '복잡한 센서 장비 없이, 체육관 스크린이나 태블릿 화면과 기본 교구만으로 즉시 구현 가능한 스포키듀 핵심 커리큘럼입니다.';
const DEFAULT_SETUP_GUIDE =
  "비싼 장비는 필요 없습니다. 체육관에 마커를 깔고, 좌측 메뉴의 '스크린 플레이 실행' 버튼을 눌러 모니터에 띄우면 셋업 끝입니다.";

/** 연간 커리큘럼과 동일: YouTube URL → video id */
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function SpokeduProDrawer({
  open,
  programId,
  programDetail,
  role,
  themeKey,
  isEditMode,
  onSaveProgramDetail,
  onClose,
  onFabClick,
}: {
  open: boolean;
  programId: number | null;
  programDetail?: ProgramDetail | null;
  role?: string;
  themeKey?: string;
  isEditMode?: boolean;
  onSaveProgramDetail?: (programId: number, detail: ProgramDetail) => Promise<void>;
  onClose: () => void;
  onFabClick?: () => void;
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    videoUrl: '',
    targetBrain: '',
    targetPhysic: '',
    tool: '',
    setupGuideText: '',
    description: '',
  });

  const d = programDetail;
  useEffect(() => {
    if (!open || programId == null) return;
    setEditForm({
      title: d?.title ?? `스포키듀 추천 커리큘럼 #${programId}`,
      videoUrl: d?.videoUrl ?? '',
      targetBrain: d?.targetBrain ?? MOCK_PROGRAM.targetBrain,
      targetPhysic: d?.targetPhysic ?? MOCK_PROGRAM.targetPhysic,
      tool: d?.tool ?? MOCK_PROGRAM.tool,
      setupGuideText: d?.setupGuideText ?? DEFAULT_SETUP_GUIDE,
      description: d?.description ?? DEFAULT_DESCRIPTION,
    });
    setIsEditModalOpen(false);
  }, [open, programId, d?.title, d?.videoUrl, d?.description, d?.targetBrain, d?.targetPhysic, d?.tool, d?.setupGuideText]);

  if (!open) return null;

  const title = d?.title ?? editForm.title ?? `스포키듀 추천 커리큘럼 #${programId ?? ''}`;
  const videoUrl = d?.videoUrl ?? editForm.videoUrl ?? '';
  const targetBrain = d?.targetBrain ?? editForm.targetBrain ?? MOCK_PROGRAM.targetBrain;
  const targetPhysic = d?.targetPhysic ?? editForm.targetPhysic ?? MOCK_PROGRAM.targetPhysic;
  const tool = d?.tool ?? editForm.tool ?? MOCK_PROGRAM.tool;
  const setupGuideText = d?.setupGuideText ?? editForm.setupGuideText ?? DEFAULT_SETUP_GUIDE;
  const description = d?.description ?? editForm.description ?? DEFAULT_DESCRIPTION;
  const videoId = getYouTubeId(videoUrl);

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm({
      title: d?.title ?? '',
      videoUrl: d?.videoUrl ?? '',
      targetBrain: d?.targetBrain ?? '',
      targetPhysic: d?.targetPhysic ?? '',
      tool: d?.tool ?? '',
      setupGuideText: d?.setupGuideText ?? '',
      description: d?.description ?? '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (programId == null || !onSaveProgramDetail) return;
    setSaving(true);
    try {
      await onSaveProgramDetail(programId, {
        title: editForm.title.trim() || undefined,
        videoUrl: editForm.videoUrl.trim() || undefined,
        targetBrain: editForm.targetBrain.trim() || undefined,
        targetPhysic: editForm.targetPhysic.trim() || undefined,
        tool: editForm.tool.trim() || undefined,
        setupGuideText: editForm.setupGuideText.trim() || undefined,
        description: editForm.description.trim() || undefined,
      });
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      title: d?.title ?? title,
      videoUrl: d?.videoUrl ?? videoUrl,
      targetBrain: d?.targetBrain ?? targetBrain,
      targetPhysic: d?.targetPhysic ?? targetPhysic,
      tool: d?.tool ?? tool,
      setupGuideText: d?.setupGuideText ?? setupGuideText,
      description: d?.description ?? description,
    });
    setIsEditModalOpen(true);
  };

  // ——— 1) 연간 센터 커리큘럼 상세 모달과 동일 구조: 중앙, 다크 패널, 영상 → 스크롤 콘텐츠 ———
  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* 영상 영역 (커리큘럼과 동일) */}
          <div className="relative w-full aspect-video bg-black">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="프로그램 영상"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <p className="text-slate-400 text-sm font-bold mb-2">영상이 등록되지 않았습니다.</p>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-slate-200 transition-colors"
                  >
                    영상·상세 수정
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            {isEditMode && videoId && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute top-4 right-14 bg-black/50 text-white px-4 py-2 rounded-full hover:bg-black/80 transition-all flex items-center gap-2 text-sm font-bold"
              >
                <Edit2 size={16} /> 수정
              </button>
            )}
          </div>

          {/* 하단 스크롤 영역 (커리큘럼과 동일: p-8 space-y-8, bg-[#2C2C2C]) */}
          <div className="p-8 space-y-8 overflow-y-auto no-scrollbar bg-[#2C2C2C] text-white">
            <div>
              <h2 className="text-2xl font-black mb-2">{title}</h2>
              <p className="text-slate-400 text-sm font-bold">
                {(role || themeKey) ? [role, themeKey].filter(Boolean).join(' · ') : '스포키듀 PRO 커리큘럼'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                <div className="flex items-center gap-2 mb-4 text-green-400 font-black text-sm uppercase">
                  <CheckSquare size={16} /> TARGET BRAIN
                </div>
                <p className="text-slate-200 text-sm font-bold leading-relaxed">
                  {targetBrain || '등록된 내용이 없습니다.'}
                </p>
              </div>
              <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
                <div className="flex items-center gap-2 mb-4 text-orange-400 font-black text-sm uppercase">
                  <Box size={16} /> PHYSICAL
                </div>
                <p className="text-slate-200 text-sm font-bold leading-relaxed">
                  {targetPhysic || '등록된 내용이 없습니다.'}
                </p>
              </div>
            </div>

            <div className="bg-[#383838] p-6 rounded-2xl border border-slate-600 text-left">
              <div className="flex items-center gap-2 mb-4 text-blue-400 font-black text-sm uppercase">
                <ListOrdered size={16} /> 셋업 가이드
              </div>
              <div className="space-y-3">
                <p className="text-slate-200 text-sm font-bold leading-relaxed">
                  <span className="text-slate-400">준비물: </span>
                  {tool || '—'}
                </p>
                <p className="text-slate-200 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                  {setupGuideText || '등록된 셋업 가이드가 없습니다.'}
                </p>
              </div>
            </div>

            <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 text-left">
              <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-xs uppercase">
                <Sparkles size={14} /> Expert Tip
              </div>
              <p className="text-indigo-100 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                {description || '등록된 팁이 없습니다.'}
              </p>
            </div>

            {isEditMode && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 transition-colors"
                >
                  <Edit2 size={18} /> 수정
                </button>
              </div>
            )}
          </div>

          {!isEditMode && onFabClick && (
            <div className="absolute bottom-8 right-8 z-10">
              <button
                type="button"
                onClick={onFabClick}
                className="w-14 h-14 bg-slate-900 hover:bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors border border-slate-700"
                aria-label="추가 기능"
              >
                <FileText className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ——— 2) 수정 모달: 연간 커리큘럼 isInputModalOpen과 동일 (흰 배경, max-w-lg, label+input) ——— */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeEditModal} />
          <form
            onSubmit={handleEditSubmit}
            className="relative bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar text-left"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">프로그램 상세 수정</h2>
              <X className="text-slate-400 cursor-pointer w-6 h-6" onClick={closeEditModal} />
            </div>

            <div className="space-y-4 font-bold text-left">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">제목</label>
                <input
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-black placeholder:text-slate-500"
                  placeholder="프로그램 제목"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">URL (YouTube)</label>
                <input
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-black placeholder:text-slate-500"
                  placeholder="유튜브 영상 링크"
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">Target Brain</label>
                <input
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-black placeholder:text-slate-500"
                  placeholder="예: 운동피질 (대근육 협응)"
                  value={editForm.targetBrain}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetBrain: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">Physical</label>
                <input
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-black placeholder:text-slate-500"
                  placeholder="예: 순발력 및 민첩성"
                  value={editForm.targetPhysic}
                  onChange={(e) => setEditForm((f) => ({ ...f, targetPhysic: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">준비물</label>
                <input
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none text-black placeholder:text-slate-500"
                  placeholder="예: 컬러 마커, 스마트 모니터"
                  value={editForm.tool}
                  onChange={(e) => setEditForm((f) => ({ ...f, tool: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">셋업 가이드</label>
                <textarea
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-sm text-black placeholder:text-slate-500"
                  placeholder="설치·준비 방법 안내"
                  value={editForm.setupGuideText}
                  onChange={(e) => setEditForm((f) => ({ ...f, setupGuideText: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase">Expert Tip</label>
                <textarea
                  className="w-full bg-slate-100 p-4 rounded-2xl outline-none h-24 resize-none text-black placeholder:text-slate-500"
                  placeholder="간단한 팁"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all text-center disabled:opacity-50"
            >
              {saving ? '저장 중…' : '수정 내용 저장'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
