/**
 * Supabase Storage 오디오 로더
 * fetch + decodeAudioData로 AudioBuffer 반환
 */

import { getSupabaseClient } from '@/app/lib/supabase/client';

const BUCKET = 'iiwarmup-files';

/**
 * Storage path → public URL
 */
export function getAudioPublicUrl(path: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Storage path → AudioBuffer
 * fetch + decodeAudioData (클라이언트 전용)
 */
export async function loadAudioBuffer(path: string): Promise<AudioBuffer> {
  const url = getAudioPublicUrl(path);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch audio: ${path} (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}
