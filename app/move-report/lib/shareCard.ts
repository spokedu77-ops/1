'use client';

import { toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`${label} 시간 초과`)), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

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
 * 1순위: html-to-image — 레이아웃이 화면과 비슷하게 나오는 편.
 * getFontEmbedCSS는 외부 폰트 CSS를 긁어오며 모바일에서 지연·실패가 잦아 쓰지 않음(라이브러리가 노드 스타일 인라인).
 * 2순위: html2canvas — foreignObject 차단·타임아웃 시.
 */
async function rasterizeWithHtmlToImage(node: HTMLElement): Promise<Blob | null> {
  const pixelRatio = Math.min(window.devicePixelRatio || 2, 2.5);
  try {
    const blob = await withTimeout(
      toBlob(node, {
        pixelRatio,
        backgroundColor: '#0A0A0A',
        cacheBust: true,
        skipFonts: false,
        type: 'image/png',
      }),
      15000,
      '이미지 변환',
    );
    if (blob && blob.size > 200) return blob;
  } catch {
    /* SecurityError, 타임아웃 등 → 폴백 */
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

  return await withTimeout(rasterizeWithHtml2Canvas(node), 30000, '이미지 변환');
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
