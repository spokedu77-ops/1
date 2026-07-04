'use client';

import { Bookmark, BookOpen, Lock } from 'lucide-react';
import Link from 'next/link';

import { getSupportedOfficialSpomovePresets } from '../../lib/program-meta';
import type { Program } from '../../types';
import { getLibraryProgramDetailHref } from '../../library/libraryNavigation';
import type { LibraryViewMode } from '../../library/libraryViewModel';
import { BottomSheet } from '../ui/BottomSheet';
import { LessonPreviewContent } from './LessonPreviewContent';

function hasSpomoveLink(program: Program) {
  return getSupportedOfficialSpomovePresets(program).length > 0;
}

export function ProgramPreviewModal({
  program,
  autoplayVideo,
  isPro = true,
  favorite,
  onFavorite,
  sourceLibraryView,
  onPlaybackStarted,
  onClose,
}: {
  program: Program;
  autoplayVideo: boolean;
  isPro?: boolean;
  favorite?: boolean;
  onFavorite?: () => void;
  sourceLibraryView?: LibraryViewMode;
  onPlaybackStarted?: () => void;
  onClose: () => void;
}) {
  const locked = program.isPro && !isPro;

  return (
    <BottomSheet
      open
      title="수업 미리보기"
      onClose={onClose}
      size="preview"
      headerActions={onFavorite ? (
        <button
          type="button"
          onClick={onFavorite}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-[10px] border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            favorite
              ? 'border-amber-200 bg-amber-50 text-amber-600'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
          aria-pressed={Boolean(favorite)}
          aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
          title={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
        >
          <Bookmark className={`h-3.5 w-3.5 ${favorite ? 'fill-current' : ''}`} />
        </button>
      ) : undefined}
    >
      <LessonPreviewContent
        program={program}
        autoplayVideo={autoplayVideo}
        onPlaybackStarted={onPlaybackStarted}
        badges={
          <>
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                <Lock className="h-3 w-3" />
                PRO 전용
              </span>
            ) : null}
            {hasSpomoveLink(program) ? (
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                SPOMOVE 연결
              </span>
            ) : null}
          </>
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="hidden h-10 w-[96px] items-center justify-center rounded-[10px] border border-slate-200 px-4 text-[13px] font-black text-slate-700 sm:inline-flex"
            >
              닫기
            </button>
            <Link
              href={getLibraryProgramDetailHref(program.id, sourceLibraryView)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-indigo-600 px-4 text-[13px] font-black text-white sm:h-10 sm:w-[168px]"
            >
              <BookOpen className="h-4 w-4" />
              전체 수업 자료 보기
            </Link>
          </div>
        }
      />
    </BottomSheet>
  );
}
