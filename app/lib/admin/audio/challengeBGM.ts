/**
 * 챌린지(무빙 챌린지) 전용 BGM 재생
 * Think 150 오디오와 완전 분리. Storage 경로 audio/challenge/bgm/ 사용.
 */

import { getPublicUrl } from '../assets/storageClient';

let audio: HTMLAudioElement | null = null;
let stopTimeoutId: ReturnType<typeof setTimeout> | null = null;
const BGM_GAIN = 0.6;

function clearTimeouts(): void {
  if (stopTimeoutId != null) {
    clearTimeout(stopTimeoutId);
    stopTimeoutId = null;
  }
}

export function stopChallengeBGM(): void {
  clearTimeouts();
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    } catch {
      /* ignore */
    }
    audio = null;
  }
}

/**
 * 챌린지 BGM 재생 (Storage 경로: audio/challenge/bgm/xxx.mp3)
 * - startOffsetMs: BGM 파일에서 재생을 시작할 위치(ms). 메타데이터 로드 후 seek 한 다음 재생해 화면 비트와 동기화.
 * - playbackRate: 재생 속도. 1 = 원곡 템포. 화면 BPM에 맞추려면 (화면 BPM / 원곡 BPM). 예: 원곡 180 BPM → 120 BPM으로 재생 시 120/180 ≈ 0.667
 * - BGM이 durationMs보다 짧으면: loop=true 로 끝까지 반복 후 durationMs에 정지.
 * - BGM이 더 길면: durationMs 시점에 재생 중단.
 * @param bgmPath Storage 상대 경로
 * @param startOffsetMs 재생 시작 위치(ms). 음원 첫 비트 위치에 맞추면 화면과 맞음.
 * @param durationMs 재생 길이(ms). 이 시간 후 정지. 0이면 무한 루프.
 * @param playbackRate 재생 속도 배율. 미지정 시 1. BPM에 맞추면 targetBpm / sourceBpm
 */
export async function startChallengeBGM(
  bgmPath: string,
  startOffsetMs: number,
  durationMs: number,
  playbackRate: number = 1
): Promise<void> {
  stopChallengeBGM();
  try {
    const url = getPublicUrl(bgmPath);
    audio = new Audio(url);
    audio.volume = BGM_GAIN;
    audio.loop = true;

    const rate = Math.max(0.25, Math.min(4, playbackRate));
    audio.playbackRate = rate;
    await new Promise<void>((resolve, reject) => {
      if (!audio) {
        resolve();
        return;
      }
      const startPlay = () => {
        if (!audio) {
          resolve();
          return;
        }
        if (startOffsetMs > 0) {
          audio.currentTime = startOffsetMs / 1000;
        }
        audio.playbackRate = rate;
        audio.play().then(() => {
          if (!audio) {
            resolve();
            return;
          }
          // 비트 동기화 필수: play() 전 currentTime이 무시되는 환경(iOS/Safari 등) 대비,
          // 재생 직후 pause → seek → play 로 오프셋을 확실히 적용한다.
          if (startOffsetMs > 0) {
            try {
              audio.pause();
              audio.currentTime = startOffsetMs / 1000;
              audio.playbackRate = rate;
              audio.play().then(() => {
                if (audio) audio.playbackRate = rate;
                resolve();
              }).catch(reject);
            } catch {
              if (audio) audio.playbackRate = rate;
              resolve();
            }
          } else {
            if (audio) audio.playbackRate = rate;
            resolve();
          }
        }).catch(reject);
      };
      if (audio.readyState >= 1) {
        startPlay();
      } else {
        audio.addEventListener('loadedmetadata', startPlay, { once: true });
        audio.addEventListener('error', () => reject(new Error('BGM load failed')), { once: true });
      }
    });

    if (durationMs > 0) {
      clearTimeouts();
      stopTimeoutId = setTimeout(() => {
        stopChallengeBGM();
        stopTimeoutId = null;
      }, durationMs);
    }
  } catch (err) {
    console.warn('[ChallengeBGM] Failed to play:', bgmPath, err);
    stopChallengeBGM();
  }
}
