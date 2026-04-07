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
 * 새 탭에 PNG 표시. iOS Safari는 부모가 만든 blob: URL을 자식 문서의 img에 넣으면 흰 화면만 나오는 경우가 많아,
 * data URL로 읽은 뒤 새 창 script 경로로 img.src에 직접 할당한다.
 */
export async function openImageBlobInNewTab(blob: Blob): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  let dataUrl: string;
  try {
    dataUrl = await readBlobAsDataUrl(blob);
  } catch {
    return false;
  }
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.open();
  w.document.write(
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>MOVE 카드</title>' +
      '<style>body{margin:0;background:#0d0d0d;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}' +
      'img{max-width:100%;height:auto;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5)}</style></head><body></body></html>',
  );
  w.document.close();
  const img = w.document.createElement('img');
  img.alt = 'MOVE 요약 카드';
  img.src = dataUrl;
  w.document.body.appendChild(img);
  return true;
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
