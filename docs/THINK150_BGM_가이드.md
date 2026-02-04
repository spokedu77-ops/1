# Think 150 BGM 추가 가이드

## 1. BGM 파일 준비

- **형식**: MP3 (권장) 또는 WAV
- **길이**: 150초 이상 (프로그램 전체 길이)
- **볼륨**: 효과음(tick)보다 낮게 (배경이므로)

## 2. Storage 업로드

1. Supabase Dashboard → Storage → `iiwarmup-files` 버킷
2. 경로 생성: `audio/think/bgm.mp3`
3. BGM 파일 업로드

## 3. 코드 연동 (구현 시)

`app/lib/admin/engines/think150/think150Audio.ts`에 BGM 로직 추가:

```typescript
const BGM_PATH = 'audio/think/bgm.mp3';

let bgmSource: AudioBufferSourceNode | null = null;

export async function startBGM(startMs: number, durationMs: number): Promise<void> {
  const ctx = getAudioContext();
  const buffer = await loadBGMBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(ctx.destination);
  const startOffset = startMs / 1000;
  source.start(ctx.currentTime, startOffset);
  bgmSource = source;
}

export function stopBGM(): void {
  if (bgmSource) {
    try { bgmSource.stop(); } catch {}
    bgmSource = null;
  }
}
```

`Think150Player`에서:
- Play 시: `startBGM(currentMs, 150000 - currentMs)`
- Pause/Reset 시: `stopBGM()` (이미 `suspendAudioContext()` 호출로 전체 오디오 중단됨)

## 4. 현재 오디오 동작

- **효과음**: cue마다 tick, Week4 recall 시 recall-start
- **Pause/Reset**: `suspendAudioContext()` 호출로 모든 오디오 즉시 중단
- **BGM**: 별도 구현 필요 (위 가이드 참고)
