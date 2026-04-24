/**
 * TTS 큐 — 겹치지 않게 순서대로 발화
 */

let ttsQueue: string[] = [];
let ttsSpeaking = false;

function ttsFlush() {
  if (!ttsQueue.length) {
    ttsSpeaking = false;
    return;
  }
  ttsSpeaking = true;
  const u = new SpeechSynthesisUtterance(ttsQueue.shift()!);
  u.lang = 'ko-KR';
  u.rate = 1.25;
  u.pitch = 1.05;
  u.onend = () => ttsFlush();
  u.onerror = () => {
    ttsSpeaking = false;
    ttsFlush();
  };
  window.speechSynthesis.speak(u);
}

export function tts(text: string | null | undefined, priority = false) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  if (priority) {
    window.speechSynthesis.cancel();
    ttsQueue = [];
    ttsSpeaking = false;
  }
  ttsQueue.push(text);
  if (!ttsSpeaking) ttsFlush();
}

export function ttsClear() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  ttsQueue = [];
  ttsSpeaking = false;
}
