import type { Program } from '../types';
import { getYouTubeId } from './program-media';

/** 자동 시드·정적 데이터에 넣었으나 펀스틱 수업과 무관한 것으로 확인된 ID — 재생·썸네일에 쓰지 않음 */
const BLOCKED_YOUTUBE_IDS = new Set(['7PJhBm5RkgY']);

/** 운영이 Spokedu 참고 영상으로 확인한 뒤 설정 (없으면 펀스틱은 영상 UI 없음) */
const FUNSTICK_VERIFIED_YOUTUBE_ID: string | undefined = undefined;

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

export function isFunstickFencingProgram(program: Pick<Program, 'id' | 'title'>): boolean {
  if (program.id === 'funstick-fencing') return true;
  const key = normalizeTitle(program.title);
  return /펀스틱|funstick/i.test(key) && /펜싱|fencing/i.test(key);
}

/** MASTER 참고 영상 — YouTube만, 차단 목록·펀스틱 미검증 URL 제외 */
export function resolveTrustedReferenceVideoUrl(
  raw: string | null | undefined,
  program?: Pick<Program, 'id' | 'title'>,
): string | undefined {
  const url = (raw ?? '').trim();
  if (!url) return undefined;

  const youtubeId = getYouTubeId(url);
  if (!youtubeId) return undefined;
  if (BLOCKED_YOUTUBE_IDS.has(youtubeId)) return undefined;

  if (program && isFunstickFencingProgram(program)) {
    if (!FUNSTICK_VERIFIED_YOUTUBE_ID) return undefined;
    if (youtubeId !== FUNSTICK_VERIFIED_YOUTUBE_ID) return undefined;
  }

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
