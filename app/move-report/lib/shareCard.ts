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

export async function sharePng(blob: Blob, title: string, text: string, fileName: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const file = new File([blob], fileName, { type: 'image/png' });
  const canShare =
    typeof (navigator as Navigator & { canShare?: (data?: ShareData) => boolean }).canShare === 'function'
      ? (navigator as Navigator & { canShare?: (data?: ShareData) => boolean }).canShare?.({ files: [file] })
      : true;
  if (!canShare) return false;
  try {
    await navigator.share({ title, text, files: [file] });
    return true;
  } catch {
    return false;
  }
}

export async function shareTextAndUrl(title: string, text: string, url: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch {
    return false;
  }
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
