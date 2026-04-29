'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useEffect, useRef } from 'react';
import { X, Edit2, FileText, ClipboardList, Package, BookOpen, Lightbulb, Gamepad2 } from 'lucide-react';
import type { ProgramDetail } from '../types';
import { FUNCTION_TYPES, MAIN_THEMES, extractEquipmentDisplayTags } from '@/app/lib/spokedu-pro/programClassification';
import { getYouTubeId } from '@/app/(pro)/spokedu-pro/utils/youtube';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';

export default function SpokeduProDrawer({
  open,
  programId,
  programDetail,
  isEditMode,
  onSaveProgramDetail,
  onClose,
  onFabClick,
  detailKind = 'program',
  onLaunchMemoryGame,
  /** 스크린플레이: 라이브러리 카드와 동일한 인지 태그(영역·과제·레벨). 없으면 기존 태그 로직 사용 */
  screenplayTags,
}: {
  open: boolean;
  programId: number | null;
  programDetail?: ProgramDetail | null;
  role?: string;
  themeKey?: string;
  isEditMode?: boolean;
  onSaveProgramDetail?: (
    programId: number,
    detail: ProgramDetail,
    options?: { screenplay?: boolean }
  ) => Promise<void>;
  onClose: () => void;
  onFabClick?: () => void;
  /** 스크린플레이(스포무브): 센터 설명 모달과 별도로 게임 실행 */
  detailKind?: 'program' | 'screenplay';
  onLaunchMemoryGame?: () => void;
  screenplayTags?: string[];
}) {
  const tr = useTranslator();
  const checklistSectionRef = useRef<HTMLElement | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    videoUrl: '',
    functionTypes: [] as string[],
    functionType: '',
    mainTheme: '',
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
      subtitle: d?.subtitle ?? '',
      videoUrl: d?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(d?.functionTypes) ? d?.functionTypes : d?.functionType ? [d.functionType] : []) ?? [],
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
      checklist: d?.checklist ?? '',
      equipment: d?.equipment ?? '',
      activityMethod: d?.activityMethod ?? '',
      activityTip: d?.activityTip ?? '',
    });
    setIsEditModalOpen(false);
  }, [
    open,
    programId,
    d?.title,
    d?.subtitle,
    d?.videoUrl,
    d?.functionType,
    d?.mainTheme,
    d?.checklist,
    d?.equipment,
    d?.activityMethod,
    d?.activityTip,
  ]);

  if (!open) return null;

  const title = stripMonthWeekPrefix(d?.title ?? editForm.title ?? `프로그램 #${programId ?? ''}`);
  const subtitle = d?.subtitle ?? editForm.subtitle ?? '';
  const videoUrl = d?.videoUrl ?? editForm.videoUrl ?? '';
  const functionTypes = (d?.functionTypes && d.functionTypes.length > 0)
    ? d.functionTypes
    : (editForm.functionTypes.length > 0 ? editForm.functionTypes : (d?.functionType ? [d.functionType] : (editForm.functionType ? [editForm.functionType] : [])));
  const functionType = d?.functionType ?? editForm.functionType; // legacy fallback
  const mainTheme = d?.mainTheme ?? editForm.mainTheme;
  const checklist = d?.checklist ?? editForm.checklist;
  const equipment = d?.equipment ?? editForm.equipment;
  const activityMethod = d?.activityMethod ?? editForm.activityMethod;
  const activityTip = d?.activityTip ?? editForm.activityTip;
  const videoId = getYouTubeId(videoUrl);

  const tags =
    detailKind === 'program' ? extractEquipmentDisplayTags(equipment) : [...functionTypes, mainTheme].filter(Boolean).slice(0, 3);
  const tagChips =
    detailKind === 'screenplay' && Array.isArray(screenplayTags) && screenplayTags.length > 0
      ? screenplayTags.slice(0, 3)
      : tags;

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditForm({
      title: d?.title ?? '',
      subtitle: d?.subtitle ?? '',
      videoUrl: d?.videoUrl ?? '',
      functionTypes:
        (Array.isArray(d?.functionTypes) ? d?.functionTypes : d?.functionType ? [d.functionType] : []) ?? [],
      functionType: d?.functionType ?? '',
      mainTheme: d?.mainTheme ?? '',
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
      await onSaveProgramDetail(
        programId,
        {
          title: editForm.title.trim() || undefined,
          subtitle: editForm.subtitle.trim() || undefined,
          videoUrl: editForm.videoUrl.trim() || undefined,
          functionTypes: editForm.functionTypes.length > 0 ? editForm.functionTypes : undefined,
          functionType: editForm.functionType.trim() || undefined,
          mainTheme: editForm.mainTheme.trim() || undefined,
          checklist: editForm.checklist.trim() || undefined,
          equipment: editForm.equipment.trim() || undefined,
          activityMethod: editForm.activityMethod.trim() || undefined,
          activityTip: editForm.activityTip.trim() || undefined,
        },
        detailKind === 'screenplay' ? { screenplay: true } : undefined
      );
      setIsEditModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      title: d?.title ?? title,
      subtitle: d?.subtitle ?? subtitle,
      videoUrl: d?.videoUrl ?? videoUrl,
      functionTypes: Array.isArray(d?.functionTypes)
        ? d?.functionTypes ?? []
        : (d?.functionType ? [d.functionType] : (functionTypes ?? [])),
      functionType: d?.functionType ?? functionType ?? '',
      mainTheme: d?.mainTheme ?? mainTheme ?? '',
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
                title={tr('프로그램 영상')}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
                  <span className="text-3xl">▶</span>
                </div>
                <p className="text-sm font-semibold">{tr('영상이 등록되지 않았습니다')}</p>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="mt-4 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {tr('상세 수정')}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label={tr('닫기')}
            >
              <X size={20} />
            </button>
            {isEditMode && videoId && (
              <button
                type="button"
                onClick={openEditModal}
                className="absolute top-4 right-16 px-4 py-2 rounded-xl bg-black/50 hover:bg-black/70 text-white text-sm font-bold flex items-center gap-2 transition-colors"
              >
                <Edit2 size={16} /> {tr('수정')}
              </button>
            )}
          </div>

          {/* 스크롤 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">{title}</h2>
              {subtitle ? (
                <p className="text-slate-400 text-sm font-medium mt-2 mb-3 whitespace-pre-wrap">{subtitle}</p>
              ) : null}
              {tagChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tagChips.map((tagVal, i) => (
                    <span
                      key={`${tagVal}-${i}`}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        detailKind === 'screenplay'
                          ? 'bg-orange-950/35 text-orange-100/90 border-orange-400/20'
                          : 'bg-slate-900/35 text-slate-200/80 border-white/10'
                      }`}
                    >
                      {tr(String(tagVal))}
                    </span>
                  ))}
                </div>
              )}
              {detailKind === 'screenplay' && (
                <div className="mt-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-950/40 via-slate-900/30 to-slate-950/40 p-4 md:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-orange-200">
                    <Gamepad2 className="w-5 h-5 shrink-0" aria-hidden />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {tr('스포무브(브레인체육) 이렇게 쓰면 돼요')}
                    </span>
                  </div>
                  <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300 [&>li]:pl-1">
                    <li>
                      {tr(
                        '아래 「SPOMOVE 실행」으로 전체 화면을 띄우면, 과제·신호·난이도는 화면 안내를 따르면 됩니다.'
                      )}
                    </li>
                    <li>
                      {tr('위 제목·부제는 수업 도입 멘트·학부모 안내용으로 활용해 보세요.')}
                    </li>
                    <li>
                      {tr('끝나면 우측 상단 X로 돌아오면 됩니다. (전체 화면은 ESC로도 닫을 수 있어요)')}
                    </li>
                  </ol>
                </div>
              )}
              {/* 수업에서 바로 쓰는 액션 */}
              <div className="flex flex-wrap gap-2 mt-4">
                {detailKind === 'screenplay' && onLaunchMemoryGame && (
                  <button
                    type="button"
                    onClick={onLaunchMemoryGame}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-colors"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    {tr('SPOMOVE 실행')}
                  </button>
                )}
              </div>
            </div>

            {checklist && (
              <section ref={checklistSectionRef} className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-amber-400">
                  <ClipboardList size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">{tr('사전 체크리스트')}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{checklist}</p>
              </section>
            )}

            {equipment && (
              <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-blue-400">
                  <Package size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">{tr('필요 교구리스트')}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{equipment}</p>
              </section>
            )}

            {activityMethod && (
              <section className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5">
                <div className="flex items-center gap-2 mb-3 text-violet-400">
                  <BookOpen size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">{tr('활동방법')}</span>
                </div>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{activityMethod}</p>
              </section>
            )}

            {activityTip && (
              <section className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-orange-950/30 border border-amber-500/20 p-5">
                <div className="flex items-center gap-2 mb-3 text-amber-300">
                  <Lightbulb size={18} />
                  <span className="text-xs font-black uppercase tracking-wider">{tr('활동 팁')}</span>
                </div>
                <p className="text-amber-100/90 text-sm leading-relaxed whitespace-pre-wrap">{activityTip}</p>
              </section>
            )}

            {!checklist && !equipment && !activityMethod && !activityTip && !subtitle && (
              <p className="text-slate-500 text-sm py-4">
                {detailKind === 'screenplay'
                  ? tr(
                      '텍스트형 체크리스트·교구 목록은 비어 있을 수 있어요. 인지 과제 본문은 「SPOMOVE 실행」화면에서 이어집니다. (관리자는 program_details로 보강 가능)'
                    )
                  : tr('등록된 상세가 없습니다.')}
              </p>
            )}

            {isEditMode && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-emerald-600 text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Edit2 size={16} /> {tr('수정')}
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
                aria-label={tr('추가 기능')}
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
              <h2 className="text-xl font-black text-white">{tr('프로그램 상세 수정')}</h2>
              <button type="button" onClick={closeEditModal} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('제목')}</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder={tr('프로그램 제목')}
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('부제 / 한 줄 설명')}</label>
                <input
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder={tr('모드·난이도 안내 등')}
                  value={editForm.subtitle}
                  onChange={(e) => setEditForm((f) => ({ ...f, subtitle: e.target.value }))}
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
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('신체 기능')}</label>
                <div className="flex flex-wrap gap-2">
                  {FUNCTION_TYPES.map((ft) => {
                    const selected = editForm.functionTypes.includes(ft);
                    return (
                      <button
                        key={ft}
                        type="button"
                        onClick={() =>
                          setEditForm((f) => {
                            const next = new Set(f.functionTypes);
                            if (next.has(ft)) next.delete(ft);
                            else next.add(ft);
                            return { ...f, functionTypes: Array.from(next) };
                          })
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-400/50'
                            : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {tr(ft)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {tr('복수 선택 가능')}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동 테마')}</label>
                <select
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  value={editForm.mainTheme}
                  onChange={(e) => setEditForm((f) => ({ ...f, mainTheme: e.target.value }))}
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="">{tr('선택')}</option>
                  {MAIN_THEMES.map((mt) => (
                    <option key={mt} value={mt}>{tr(mt)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('사전 체크리스트')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('진행 전 확인할 항목')}
                  value={editForm.checklist}
                  onChange={(e) => setEditForm((f) => ({ ...f, checklist: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('필요 교구리스트')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-20"
                  placeholder={tr('준비할 교구')}
                  value={editForm.equipment}
                  onChange={(e) => setEditForm((f) => ({ ...f, equipment: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동방법')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('진행 방법')}
                  value={editForm.activityMethod}
                  onChange={(e) => setEditForm((f) => ({ ...f, activityMethod: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{tr('활동 팁')}</label>
                <textarea
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none h-24"
                  placeholder={tr('활동 시 팁')}
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
              {saving ? tr('저장 중…') : tr('저장')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
