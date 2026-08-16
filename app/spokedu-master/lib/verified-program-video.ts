import type { Program } from '../types';
import { getYouTubeId } from './program-media';

/** 자동 시드·정적 데이터에 넣었으나 수업과 무관한 것으로 확인된 ID — 재생·썸네일에 쓰지 않음 */
const BLOCKED_YOUTUBE_IDS = new Set(['7PJhBm5RkgY']);

/** MASTER 참고 영상 — YouTube만, 차단 목록 제외 */
export function resolveTrustedReferenceVideoUrl(
  raw: string | null | undefined,
  _program?: Pick<Program, 'id' | 'title'>,
): string | undefined {
  void _program;
  const url = (raw ?? '').trim();
  if (!url) return undefined;

  const youtubeId = getYouTubeId(url);
  if (!youtubeId) return undefined;
  if (BLOCKED_YOUTUBE_IDS.has(youtubeId)) return undefined;

  return url;
}

export function applyTrustedReferenceVideo(program: Program): Program {
  const trusted = resolveTrustedReferenceVideoUrl(program.lessonDetail?.videoUrl, program);
  const detail = program.lessonDetail;
  if (!detail) return program;
  if (trusted === detail.videoUrl) return program;

  return {
    ...program,
    lessonDetail: {
      ...detail,
      videoUrl: trusted,
    },
  };
}
