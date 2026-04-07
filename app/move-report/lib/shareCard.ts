'use client';

import html2canvas from 'html2canvas';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function makeShareCardBlob(node: HTMLElement): Promise<Blob> {
  // 폰트/레이아웃이 안정화된 뒤 캡처해야 모바일에서 빈 이미지가 줄어듭니다.
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch {
      // 폰트 준비 실패는 치명적이지 않으므로 캡처를 계속 진행합니다.
    }
  }
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const canvas = await html2canvas(node, {
    backgroundColor: '#0D0D0D',
    scale: Math.min(window.devicePixelRatio || 1, 2),
    useCORS: true,
    allowTaint: false,
    imageTimeout: 15000,
    removeContainer: true,
    logging: false,
  });

  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) {
    try {
      blob = dataUrlToBlob(canvas.toDataURL('image/png', 1));
    } catch {
      throw new Error('이미지 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
  return blob;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const v = r.result;
      if (typeof v === 'string') resolve(v);
      else reject(new Error('data url'));
    };
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(blob);
  });
}

/**
 * iOS Safari: 터치 직후가 아닌 `await` 뒤에 호출되는 `window.open()`은 새 탭은 열리지만
 * 문서에 쓰기가 막혀 흰 화면만 남는 경우가 많음 → 반드시 클릭 핸들러에서 **동기로** 먼저 연 뒤,
 * `fillImageViewerWindow`로 내용을 채운다.
 */
export function openImageViewerWindowSync(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open('about:blank', '_blank');
}

/**
 * 이미 연 `about:blank` 창에 PNG 표시. data URL + img (blob URL은 새 문서 img에서 iOS가 자주 실패).
 */
export async function fillImageViewerWindow(w: Window, blob: Blob): Promise<boolean> {
  let dataUrl: string;
  try {
    dataUrl = await readBlobAsDataUrl(blob);
  } catch {
    return false;
  }
  try {
    const doc = w.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><title>MOVE 카드</title>' +
        '<style>*{box-sizing:border-box}html,body{margin:0;padding:0;min-height:100%;background:#0d0d0d}' +
        'body{display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-left));padding-bottom:max(12px,env(safe-area-inset-bottom))}' +
        'img{max-width:100%;height:auto;display:block;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5)}</style></head><body></body></html>',
    );
    doc.close();
    const img = doc.createElement('img');
    img.alt = 'MOVE 요약 카드';
    img.decoding = 'async';
    const loaded = await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      // iOS에서 onload/onerror 콜백이 유실되는 경우 대비
      window.setTimeout(() => finish(false), 3500);
      img.src = dataUrl;
      doc.body.appendChild(img);
    });
    if (loaded) return true;
  } catch {
    // 아래 location 폴백으로 진행
  }
  try {
    // 최종 폴백: 문서 렌더링 대신 data URL을 직접 로드
    w.location.replace(dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function downloadPng(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value || typeof navigator === 'undefined') return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'true');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
