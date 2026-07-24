/**
 * OOXML/HWPX 등 ZIP 기반 문서 안의 임베드 이미지를 업로드 전 리사이즈·압축.
 * (docx / pptx / xlsx / hwpx — PDF·구형 .doc/.hwp는 그대로 통과)
 */

import JSZip from 'jszip';

const OFFICE_ZIP_EXT = /\.(docx|pptx|xlsx|hwpx)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
/** 아이콘·장식 이미지는 건드리지 않음 */
const MIN_BYTES_TO_COMPRESS = 80 * 1024;
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

function fitContain(w: number, h: number, maxEdge: number) {
  const ratio = Math.min(maxEdge / w, maxEdge / h, 1);
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  };
}

function sniffImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('embedded image load failed'));
    };
    img.src = url;
  });
}

/**
 * 문서 호환을 위해 확장자/경로를 유지한 채 같은 계열로 재인코딩.
 * (png→jpg 변환 시 Content_Types·rels 수정이 필요해 깨질 수 있음)
 */
async function recompressEmbeddedImage(
  data: Uint8Array,
  path: string
): Promise<Uint8Array | null> {
  const sniffed = sniffImageMime(data);
  const byExt = IMAGE_EXT.test(path);
  if (!sniffed && !byExt) return null;
  if (data.byteLength < MIN_BYTES_TO_COMPRESS) return null;

  const mime = sniffed ?? (/\.png$/i.test(path) ? 'image/png' : /\.webp$/i.test(path) ? 'image/webp' : 'image/jpeg');
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const blob = new Blob([copy], { type: mime });

  let img: HTMLImageElement;
  try {
    img = await loadImageFromBlob(blob);
  } catch {
    return null;
  }

  const { width, height } = fitContain(img.width, img.height, MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // JPEG는 알파 없음 — 흰 배경
  if (mime === 'image/jpeg' || /\.jpe?g$/i.test(path)) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  const outMime =
    mime === 'image/png' || /\.png$/i.test(path)
      ? 'image/png'
      : mime === 'image/webp' || /\.webp$/i.test(path)
        ? 'image/webp'
        : 'image/jpeg';
  const quality = outMime === 'image/png' ? undefined : JPEG_QUALITY;

  const outBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), outMime, quality);
  });
  if (!outBlob) return null;

  // 줄어들지 않으면 원본 유지
  if (outBlob.size >= data.byteLength * 0.95) return null;

  return new Uint8Array(await outBlob.arrayBuffer());
}

export function isCompressibleOfficeDocument(file: File): boolean {
  return OFFICE_ZIP_EXT.test(file.name);
}

/**
 * ZIP 기반 문서의 임베드 이미지를 압축한 새 File 반환.
 * 실패·비대상·이득 없으면 원본 File을 그대로 반환.
 */
export async function compressDocumentEmbeddedImages(file: File): Promise<File> {
  if (!isCompressibleOfficeDocument(file)) return file;

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return file;
  }

  const entries = Object.keys(zip.files).filter((path) => {
    const entry = zip.files[path];
    if (!entry || entry.dir) return false;
    // media / BinData 위주 + 확장자 이미지
    const inMedia =
      /\/media\//i.test(path) ||
      /(^|\/)BinData\//i.test(path) ||
      /(^|\/)Preview\//i.test(path);
    return inMedia || IMAGE_EXT.test(path);
  });

  if (entries.length === 0) return file;

  let changed = 0;

  for (const path of entries) {
    const entry = zip.files[path];
    if (!entry) continue;
    try {
      const original = await entry.async('uint8array');
      const next = await recompressEmbeddedImage(original, path);
      if (!next) continue;
      zip.file(path, next, { binary: true });
      changed += 1;
    } catch {
      // 개별 이미지 실패는 무시하고 나머지 진행
    }
  }

  if (changed === 0) return file;

  const outBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // 전체가 오히려 커지면 원본 유지
  if (outBlob.size >= file.size) return file;

  return new File([outBlob], file.name, {
    type: file.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
}
