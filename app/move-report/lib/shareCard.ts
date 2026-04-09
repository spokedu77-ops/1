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
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
    } catch { /* 무시 */ }
  }

  const rect = node.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  /** 뷰포트 밖(수평·수직) — 화면에 보이는 노드에는 onclone을 쓰지 않아 레이아웃 왜곡 방지 */
  const isOffscreen =
    rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw;

  const capture = async (): Promise<Blob> => {
    const canvas = await html2canvas(node, {
      backgroundColor: '#0A0A0A',
      scale: window.devicePixelRatio || 2,
      useCORS: true,
      logging: false,
      ...(isOffscreen
        ? {
            onclone: (_clonedDoc, cloned) => {
              if (!(cloned instanceof HTMLElement)) return;
              cloned.style.position = 'absolute';
              cloned.style.left = '0';
              cloned.style.top = '0';
              cloned.style.margin = '0';
            },
          }
        : {}),
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
  };

  if (!isOffscreen) {
    const prevY = window.scrollY;
    node.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    await new Promise((r) => setTimeout(r, 80));
    try {
      return await capture();
    } finally {
      window.scrollTo({ top: prevY, behavior: 'instant' as ScrollBehavior });
    }
  }

  return capture();
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
