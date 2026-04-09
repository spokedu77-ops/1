'use client';

import { getFontEmbedCSS, toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** html2canvas 전용: 클론에서 웹폰트 메트릭 차이 완화 */
function normalizeFontsInHtml2CanvasClone(root: HTMLElement): void {
  const list = [root, ...root.querySelectorAll<HTMLElement>('*')];
  for (const el of list) {
    el.style.fontFamily = '"Noto Sans KR", "Malgun Gothic", sans-serif';
  }
}

/**
 * 1순위: html-to-image — SVG foreignObject로 브라우저 레이아웃·박스 내 텍스트 정렬이 화면과 거의 동일.
 * 2순위: html2canvas — iOS/Safari 등에서 foreignObject 실패 시.
 */
async function rasterizeWithHtmlToImage(node: HTMLElement): Promise<Blob | null> {
  const pixelRatio = Math.min(window.devicePixelRatio || 2, 2.5);
  let fontEmbedCSS: string | undefined;
  try {
    fontEmbedCSS = await getFontEmbedCSS(node, { cacheBust: true });
  } catch {
    fontEmbedCSS = undefined;
  }
  try {
    const blob = await toBlob(node, {
      pixelRatio,
      backgroundColor: '#0A0A0A',
      cacheBust: true,
      skipFonts: false,
      type: 'image/png',
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    });
    if (blob && blob.size > 500) return blob;
  } catch {
    /* SecurityError 등 → 폴백 */
  }
  return null;
}

async function rasterizeWithHtml2Canvas(node: HTMLElement): Promise<Blob> {
  const rect = node.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
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
              normalizeFontsInHtml2CanvasClone(cloned);
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

export async function makeShareCardBlob(node: HTMLElement): Promise<Blob> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready;
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      /* 무시 */
    }
  }

  const primary = await rasterizeWithHtmlToImage(node);
  if (primary) return primary;

  return rasterizeWithHtml2Canvas(node);
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
