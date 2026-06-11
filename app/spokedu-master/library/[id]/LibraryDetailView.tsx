'use client';

import {
  ArrowLeft,
  Bookmark,
  Check,
  Clipboard,
  ExternalLink,
  FileText,
  MonitorPlay,
  Play,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BottomSheet } from '../../components/ui/BottomSheet';

import {
  LessonBulletList,
  LessonChecklistCard,
  LessonCoachScript,
  LessonFullSection,
  LessonMetaGrid,
  LessonNumberedList,
  LessonTitle,
  LessonVariationText,
} from '../../components/lesson/LessonPanels';
import {
  getLessonBriefingNotes,
  getLessonEquipment,
  getLessonFieldTips,
  getLessonFunction,
  getLessonMovement,
  getLessonRules,
  getLessonSafetyNotes,
  getLessonScript,
  getLessonSpace,
  getLessonTarget,
  getLessonTheme,
  getLessonTime,
  getLessonTitle,
  getLessonVariations,
} from '../../lib/lessonDisplay';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  isDirectVideoUrl,
} from '../../lib/program-media';
import {
  findOfficialSpomovePreset,
  officialPresetSessionHref,
} from '../../spomove/officialSpomovePresets';
import { useMasterStore } from '../../store';
import type { ClassRecord, Program } from '../../types';

const THUMBNAIL_FRAME = 'relative aspect-square w-full max-w-[1250px] overflow-hidden';

function getParentCopy(program: Program) {
  return program.lessonDetail?.parentNote?.trim() ?? '';
}

function BookOpenFallback() {
  return (
    <div className="inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-500">
      <FileText className="h-7 w-7" />
    </div>
  );
}

export default function LibraryDetailView({ id }: { id: string }) {
  const programs = useMasterStore((state) => state.programs);
  const favorites = useMasterStore((state) => state.favorites);
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const classRecords = useMasterStore((state) => state.classRecords);
  const saveQuickClassRecord = useMasterStore((state) => state.saveQuickClassRecord);
  const [copied, setCopied] = useState(false);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickDate, setQuickDate] = useState('');
  const [quickClassId, setQuickClassId] = useState('');
  const [quickMemo, setQuickMemo] = useState('');
  const [quickParentNote, setQuickParentNote] = useState('');
  const [quickSaved, setQuickSaved] = useState(false);

  const program = useMemo(() => programs.find((item) => item.id === id), [id, programs]);
  const usageRecords = useMemo(() => classRecords.filter((record) => record.programId === id), [classRecords, id]);

  if (!program) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f5f7fb] px-6 text-center">
        <BookOpenFallback />
        <h1 className="mt-5 text-xl font-black text-slate-950">수업 자료를 찾을 수 없습니다.</h1>
        <p className="mt-2 text-sm text-slate-400">라이브러리에서 다른 수업을 선택해 주세요.</p>
        <Link href="/spokedu-master/library" className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  const detail = program.lessonDetail;
  const title = getLessonTitle(program);
  const equipment = getLessonEquipment(program);
  const script = getLessonScript(program);
  const briefingNotes = getLessonBriefingNotes(program);
  const ruleItems = getLessonRules(program);
  const variations = getLessonVariations(program);
  const safetyNotes = getLessonSafetyNotes(program);
  const fieldTips = getLessonFieldTips(program);
  const parentCopy = getParentCopy(program);
  const favorite = favorites.includes(program.id);
  const usageCount = usageRecords.length;
  const latestUsageDate = usageRecords.length > 0
    ? new Date([...usageRecords].sort((a, b) => b.date.localeCompare(a.date))[0].date)
        .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : null;

  const openQuickModal = () => {
    setQuickDate(new Date().toISOString().slice(0, 10));
    setQuickClassId('');
    setQuickMemo('');
    setQuickParentNote(getParentCopy(program));
    setQuickSaved(false);
    setQuickModalOpen(true);
  };

  const canSaveQuickRecord = Boolean(quickDate.trim());

  const handleQuickSave = () => {
    if (!canSaveQuickRecord) return;
    const record: ClassRecord = {
      id: Date.now().toString(),
      lessonTitle: title,
      classId: quickClassId.trim() || '수업',
      programId: program.id,
      programTitle: program.title,
      date: new Date(quickDate).toISOString(),
      present: 0,
      absent: 0,
      focusCount: 0,
      skillCount: 0,
      kakaoSent: false,
      students: [],
      memo: quickMemo.trim() || undefined,
      parentNoteSnapshot: quickParentNote.trim() || undefined,
      recordType: 'quick',
    };
    saveQuickClassRecord(record);
    setQuickSaved(true);
  };
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl, { autoplay: true });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const setupImage = detail?.setupImageUrl?.trim();
  const galleryImages = (detail?.galleryImageUrls ?? []).filter((url) => url.trim());
  const relatedSpomovePresets = (detail?.relatedSpomoveIds ?? [])
    .map((spomoveId) => findOfficialSpomovePreset(spomoveId))
    .filter((preset): preset is NonNullable<typeof preset> => Boolean(preset));
  const primarySpomovePreset = relatedSpomovePresets[0];

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main className="min-h-dvh bg-[#f6f7f9] pb-24 text-slate-950 lg:pb-14">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href="/spokedu-master/library" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700" aria-label="라이브러리로 돌아가기">
          <ArrowLeft className="h-4 w-4" />
          목록
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(program.id)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"
          aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[1360px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-6">
          <LessonTitle
            title={title}
            badges={usageCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                <Check className="h-3 w-3" />
                {usageCount}회 사용{latestUsageDate ? ` · 최근 ${latestUsageDate}` : ''}
              </span>
            ) : undefined}
          />
          <div className="mt-3">
            <LessonMetaGrid
              cells={[
                { label: '테마', value: getLessonTheme(program) || '—' },
                { label: '대상', value: getLessonTarget(program) || '—' },
                { label: '기능', value: getLessonFunction(program) || '—' },
                { label: '움직임', value: getLessonMovement(program) || '—' },
                { label: '공간', value: getLessonSpace(program) || '—' },
                { label: '시간', value: getLessonTime(program) || '—' },
              ]}
            />
          </div>
        </section>

        <LessonFullSection title="사전 체크리스트">
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-4">
            <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-indigo-600">초기 교구 세팅</p>
              {setupImage ? (
                <div className="mt-2 overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-square lg:aspect-[4/5]">
                    <Image src={setupImage} alt={`${title} 세팅 방법`} fill sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" unoptimized />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-slate-400">—</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <LessonChecklistCard label="준비물" accent="emerald">
                <LessonBulletList items={equipment} compact />
              </LessonChecklistCard>
              <LessonChecklistCard label="수업 스크립트" accent="indigo">
                <LessonCoachScript text={script} />
              </LessonChecklistCard>
              <LessonChecklistCard label="사전 교육">
                <LessonBulletList items={briefingNotes} compact />
              </LessonChecklistCard>
            </div>
          </div>
        </LessonFullSection>

        {hasVideo ? (
          <LessonFullSection title="영상">
            <div className="overflow-hidden rounded-[14px] bg-slate-950">
              <div className="relative aspect-video">
                {videoEmbedUrl ? (
                  <iframe
                    key={`${program.id}-${videoEmbedUrl}`}
                    src={videoEmbedUrl}
                    title={`${title} 참고 영상`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : directVideoUrl ? (
                  <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay muted />
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center text-white">
                    <div>
                      <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
                      <p className="mt-4 text-base font-black">참고 영상 링크</p>
                      <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950">
                        유튜브에서 열기
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </LessonFullSection>
        ) : null}

        <LessonFullSection title="활동 방법">
          <LessonNumberedList items={ruleItems} />
        </LessonFullSection>

        {/* 보호자 문구 — 등록된 값이 있을 때만 표시 (6순위) */}
        {parentCopy ? (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black text-emerald-800">학부모 설명 문구</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-emerald-900">{parentCopy}</p>
            <button type="button" onClick={copyParentNote} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '학부모 문구 복사'}
            </button>
          </div>
        ) : null}

        {/* 변형 / 안전 / 현장 팁 — 7순위, 값이 있을 때만 표시 */}
        {variations.length > 0 ? (
          <LessonFullSection title="변형 방법">
            <LessonVariationText text={variations.join('\n')} />
          </LessonFullSection>
        ) : null}

        {safetyNotes.length > 0 ? (
          <LessonFullSection title="안전">
            <LessonBulletList items={safetyNotes} compact />
          </LessonFullSection>
        ) : null}

        {fieldTips.length > 0 ? (
          <LessonFullSection title="현장 팁">
            <LessonBulletList items={fieldTips} compact />
          </LessonFullSection>
        ) : null}

        {(relatedSpomovePresets.length > 0 || galleryImages.length > 0) ? (
          <details className="rounded-[14px] border border-slate-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-black text-slate-700">추가 자료 (SPOMOVE · 수업 장면)</summary>
            <div className="mt-4 space-y-4">
              {relatedSpomovePresets.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {relatedSpomovePresets.map((preset) => (
                    <Link
                      key={preset.id}
                      href={officialPresetSessionHref(preset)}
                      className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                        <MonitorPlay className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black text-slate-950">{preset.title}</strong>
                        <span className="mt-1 block text-xs font-semibold text-indigo-700">TV·빔 실행</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {galleryImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {galleryImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
                      <div className={THUMBNAIL_FRAME}>
                        <Image src={imageUrl} alt={`${title} 수업 장면 ${index + 1}`} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" unoptimized />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        <div className="sticky bottom-0 z-20 flex flex-col gap-2 rounded-[14px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex-row">
          {primarySpomovePreset ? (
            <Link href={officialPresetSessionHref(primarySpomovePreset)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 실행
            </Link>
          ) : null}
          <button type="button" onClick={openQuickModal} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white">
            <Check className="h-4 w-4" />
            오늘 수업으로 기록
          </button>
          <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">
            <FileText className="h-4 w-4" />
            안내문 만들기
          </Link>
          <button type="button" onClick={() => toggleFavorite(program.id)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            {favorite ? '즐겨찾기됨' : '즐겨찾기'}
          </button>
        </div>
      </div>

      <BottomSheet open={quickModalOpen} title="오늘 수업으로 기록" onClose={() => setQuickModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700">날짜 <span className="font-semibold text-red-400">*</span></label>
            <input
              type="date"
              value={quickDate}
              onChange={(e) => setQuickDate(e.target.value)}
              className={`mt-1.5 h-11 w-full rounded-xl border bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 ${!quickDate ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'}`}
            />
            {!quickDate ? (
              <p className="mt-1 text-[11px] font-semibold text-red-400">날짜를 선택해야 저장할 수 있습니다.</p>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">반/기관명</label>
            <input
              type="text"
              value={quickClassId}
              onChange={(e) => setQuickClassId(e.target.value)}
              placeholder="예: 토끼반, ○○초등학교"
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">메모 <span className="font-semibold text-slate-400">(선택)</span></label>
            <textarea
              value={quickMemo}
              onChange={(e) => setQuickMemo(e.target.value)}
              placeholder="수업 중 특이사항, 다음 수업 준비 메모"
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700">
              학부모 안내 문구 <span className="font-semibold text-slate-400">(수정 가능)</span>
            </label>
            <textarea
              value={quickParentNote}
              onChange={(e) => setQuickParentNote(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-400">필요 없으면 비워도 됩니다. 저장된 문구는 수업 기록에만 남고, 원본 수업 자료는 변경되지 않습니다.</p>
          </div>
          {quickSaved ? (
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                <Check className="h-4 w-4" />
                사용 기록이 저장되었습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/spokedu-master/class-record" onClick={() => setQuickModalOpen(false)} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700">수업 기록 보기</Link>
                <Link href={`/spokedu-master/report?program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700">안내문 만들기</Link>
                <Link href={`/spokedu-master/class-record?program=${program.id}`} onClick={() => setQuickModalOpen(false)} className="inline-flex h-9 items-center rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700">학생 기록 작성</Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQuickModalOpen(false)}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleQuickSave}
                disabled={!canSaveQuickRecord}
                className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-50"
              >
                사용 기록 저장
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}
