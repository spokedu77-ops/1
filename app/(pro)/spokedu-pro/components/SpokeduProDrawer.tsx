'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Edit2, FileText, ClipboardList, Package, BookOpen, Lightbulb, Play, ListChecks } from 'lucide-react';
import type { ProgramDetail } from '../types';
import { FUNCTION_TYPES, MAIN_THEMES, GROUP_SIZES } from '@/app/lib/spokedu-pro/programClassification';

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
  const checklistSectionRef = useRef<HTMLElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    videoUrl: '',
    functionType: '',
    mainTheme: '',
    groupSize: '',
    checklist: '',
    equipment: '',
    activityMethod: '',
    activityTip: '',
  });

  const d = programDetail;
  useEffect(() => {
    if (!open || programId == null) return;
    setEditForm({
      title: d?.title ?? `프로그램 #${programId}`,
      videoUrl: d?.videoUrl ?? '',
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
      groupSize: d?.groupSize ?? '',
      checklist: d?.checklist ?? '',
      equipment: d?.equipment ?? '',
      activityMethod: d?.activityMethod ?? '',
      activityTip: d?.activityTip ?? '',
    });
    setIsEditModalOpen(false);
  }, [open, programId, d?.title, d?.videoUrl, d?.functionType, d?.mainTheme, d?.groupSize, d?.checklist, d?.equipment, d?.activityMethod, d?.activityTip]);

  if (!open) return null;

  const title = d?.title ?? editForm.title ?? `프로그램 #${programId ?? ''}`;
  const videoUrl = d?.videoUrl ?? editForm.videoUrl ?? '';
  const functionType = d?.functionType ?? editForm.functionType;
  const mainTheme = d?.mainTheme ?? editForm.mainTheme;
  const groupSize = d?.groupSize ?? editForm.groupSize;
  const checklist = d?.checklist ?? editForm.checklist;
  const equipment = d?.equipment ?? editForm.equipment;
  const activityMethod = d?.activityMethod ?? editForm.activityMethod;
  const activityTip = d?.activityTip ?? editForm.activityTip;
  const videoId = getYouTubeId(videoUrl);

  const tags = [functionType, mainTheme, groupSize].filter(Boolean);

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm({
      title: d?.title ?? '',
      videoUrl: d?.videoUrl ?? '',
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
      groupSize: d?.groupSize ?? '',
      checklist: d?.checklist ?? '',
      equipment: d?.equipment ?? '',
      activityMethod: d?.activityMethod ?? '',
      activityTip: d?.activityTip ?? '',
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
        functionType: editForm.functionType.trim() || undefined,
        mainTheme: editForm.mainTheme.trim() || undefined,
        groupSize: editForm.groupSize.trim() || undefined,
        checklist: editForm.checklist.trim() || undefined,
        equipment: editForm.equipment.trim() || undefined,
        activityMethod: editForm.activityMethod.trim() || undefined,
        activityTip: editForm.activityTip.trim() || undefined,
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
      functionType: d?.functionType ?? functionType ?? '',
      mainTheme: d?.mainTheme ?? mainTheme ?? '',
      groupSize: d?.groupSize ?? groupSize ?? '',
      checklist: d?.checklist ?? checklist ?? '',
      equipment: d?.equipment ?? equipment ?? '',
      activityMethod: d?.activityMethod ?? activityMethod ?? '',
      activityTip: d?.activityTip ?? activityTip ?? '',
    });
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] bg-slate-900 border border-slate-700/80">
          {/* 비디오 */}
          <div className="relative w-full aspect-video bg-slate-950">
            {videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="프로그램 영상"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                  <span className="text-3xl">▶</span>
                </div>
                <p className="text-sm font-semibold">영상이 등록되지 않았습니다</p>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="mt-4 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    상세 수정
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            {isEditMode && videoId && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute top-4 right-16 px-4 py-2 rounded-xl bg-black/50 hover:bg-black/70 text-white text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Edit2 size={16} /> 수정
              </button>
            )}
          </div>

          {/* 스크롤 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mb-3">{title}</h2>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {/* 수업에서 바로 쓰는 액션 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    영상 보기
                  </a>
                )}
                {checklist && (
                  <button
                    type="button"
                    onClick={() => checklistSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors"
                  >
                    <ListChecks className="w-4 h-4" />
                    체크리스트 보기
                  </button>
                )}
              </div>
            </div>

            {checklist && (
              <section ref={checklistSectionRef} className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <ClipboardList size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">사전 체크리스트</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{checklist}</p>
              </section>
            )}

            {equipment && (
              <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-blue-400">
                  <Package size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">필요 교구리스트</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{equipment}</p>
              </section>
            )}

            {activityMethod && (
              <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-violet-400">
                  <BookOpen size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">활동방법</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{activityMethod}</p>
              </section>
            )}

            {activityTip && (
              <section className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/20 p-5">
                <div className="flex items-center gap-2 mb-3 text-amber-300">
                  <Lightbulb size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">활동 팁</span>
                </div>
                <p className="text-amber-100/90 text-sm leading-relaxed whitespace-pre-wrap">{activityTip}</p>
              </section>
            )}

            {!checklist && !equipment && !activityMethod && !activityTip && (
              <p className="text-slate-500 text-sm py-4">등록된 상세가 없습니다.</p>
            )}

            {isEditMode && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Edit2 size={16} /> 수정
                </button>
              </div>
            )}
          </div>

          {!isEditMode && onFabClick && (
            <div className="absolute bottom-6 right-6 z-10">
              <button
                type="button"
                onClick={onFabClick}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-colors border border-slate-600"
                aria-label="추가 기능"
              >
                <FileText className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeEditModal} />
          <form
            onSubmit={handleEditSubmit}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 md:p-8 space-y-5 text-left"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-white">프로그램 상세 수정</h2>
              <button type="button" onClick={closeEditModal} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">제목</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="프로그램 제목"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">YouTube URL</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="https://youtube.com/..."
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, videoUrl: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">기능 종류</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={editForm.functionType}
                  onChange={(e) => setEditForm((f) => ({ ...f, functionType: e.target.value }))}
                >
                  <option value="">선택</option>
                  {FUNCTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">메인테마</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={editForm.mainTheme}
                  onChange={(e) => setEditForm((f) => ({ ...f, mainTheme: e.target.value }))}
                >
                  <option value="">선택</option>
                  {MAIN_THEMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">인원구성</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={editForm.groupSize}
                  onChange={(e) => setEditForm((f) => ({ ...f, groupSize: e.target.value }))}
                >
                  <option value="">선택</option>
                  {GROUP_SIZES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">사전 체크리스트</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder="진행 전 확인할 항목"
                  value={editForm.checklist}
                  onChange={(e) => setEditForm((f) => ({ ...f, checklist: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">필요 교구리스트</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
                  placeholder="준비할 교구"
                  value={editForm.equipment}
                  onChange={(e) => setEditForm((f) => ({ ...f, equipment: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">활동방법</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder="진행 방법"
                  value={editForm.activityMethod}
                  onChange={(e) => setEditForm((f) => ({ ...f, activityMethod: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">활동 팁</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder="활동 시 팁"
                  value={editForm.activityTip}
                  onChange={(e) => setEditForm((f) => ({ ...f, activityTip: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-colors disabled:opacity-50"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
