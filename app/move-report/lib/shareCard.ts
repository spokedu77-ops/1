'use client';

import html2canvas from 'html2canvas';

export async function makeShareCardBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: Math.min(window.devicePixelRatio || 1, 3),
    useCORS: true,
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('이미지 생성에 실패했습니다.');
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
  await navigator.share({ title, text, files: [file] });
  return true;
}
