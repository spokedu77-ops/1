/**
 * Flow Phase Engine - Effects System
 * PR-A: React 렌더된 LensLayer의 DOM을 query해서 style만 업데이트
 * 
 * Based on legacy_space_flow.html lens-layer + makeGrain() + pulseExposure()
 * 
 * DOM create/remove 금지:
 * - LensLayer.tsx가 React로 고정 렌더
 * - 이 시스템은 style 업데이트만 수행
 */

/**
 * Generate grain texture as data URL
 * Called once on initialization
 */
export function generateGrainDataURL(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = 120 + Math.random() * 60;
    imageData.data[i] = value; // R
    imageData.data[i + 1] = value; // G
    imageData.data[i + 2] = value; // B
    imageData.data[i + 3] = 255; // A
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
}

export interface EffectsAPI {
  pulseExposure: (strength?: number) => void;
  setVignetteOpacity: (opacity: number) => void;
  flash: () => void;
}

/**
 * Initialize effects system (React 렌더된 DOM 참조)
 * DOM create/remove 없음, style 업데이트만
 * 
 * PR-A 리스크 체크:
 * - pulseExposure: setTimeout으로 opacity 복귀 (55ms)
 * - flash: 이전 타이머 clear로 연속 호출 안전
 * - 중복 init 안전 (element query만, 부작용 없음)
 */
export function initEffects(): EffectsAPI {
  // Query React-rendered elements
  const grain = document.getElementById('grain');
  const exposurePulse = document.getElementById('exposure-pulse');
  const vignette = document.getElementById('vignette');
  const flashOverlay = document.getElementById('flash-overlay');
  
  // PR-D: DevPanel에서 동적 조절 가능하도록 초기 opacity 저장
  const initialVignetteOpacity = vignette ? parseFloat(getComputedStyle(vignette).opacity) : 0.4;
  const initialGrainOpacity = grain ? parseFloat(getComputedStyle(grain).opacity) : 0.1;

  // Set grain texture (once)
  if (grain) {
    const grainDataURL = generateGrainDataURL();
    grain.style.backgroundImage = `url(${grainDataURL})`;
  }

  // Timer tracking for safe cleanup
  let pulseTimer: ReturnType<typeof setTimeout> | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  // API functions (style update only)
  const pulseExposure = (strength: number = 0.10) => {
    if (!exposurePulse) return;
    
    // Clear previous timer
    if (pulseTimer) clearTimeout(pulseTimer);
    
    exposurePulse.style.opacity = String(strength);
    pulseTimer = setTimeout(() => {
      if (exposurePulse) exposurePulse.style.opacity = '0';
      pulseTimer = null;
    }, 55);
  };

  const setVignetteOpacity = (opacity: number) => {
    if (!vignette) return;
    vignette.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  };

  const flash = () => {
    if (!flashOverlay) return;
    
    // Clear previous timer (연속 호출 안전)
    if (flashTimer) clearTimeout(flashTimer);
    
    flashOverlay.style.opacity = '0.75';
    flashTimer = setTimeout(() => {
      if (flashOverlay) flashOverlay.style.opacity = '0';
      flashTimer = null;
    }, 70);
  };

  return { pulseExposure, setVignetteOpacity, flash };
}
