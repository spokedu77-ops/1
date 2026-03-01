/**
 * 이미지 최적화 유틸리티
 * 클라이언트 우선 + WebP 강제 통일
 */

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/** Play 에셋 슬롯 (UI/로직은 Slot만 사용, DB 호환용 off/on 유지 가능) */
export type Slot = 'off1' | 'off2' | 'on1' | 'on2';
/** 레거시 variant (필요 시 포함) */
export type VariantLegacy = 'off' | 'on';
export type SlotOrVariant = Slot | VariantLegacy;

export interface OptimizeResult {
  file: File;
  storagePath: string;
  needsServerOptimization: boolean;
}

export interface OptimizeToWebPOptions {
  maxW?: number;
  maxH?: number;
  quality?: number;
}

/**
 * 입력 포맷 가드
 */
export function validateImageFormat(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. PNG, JPG, WebP만 업로드 가능합니다. (현재: ${file.type})`
    };
  }
  return { valid: true };
}

/**
 * 클라이언트 리사이즈 (Canvas 기반)
 */
export async function resizeImageClient(
  file: File,
  maxWidth: number = MAX_WIDTH,
  maxHeight: number = MAX_HEIGHT
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context를 가져올 수 없습니다.'));
      return;
    }

    img.onload = () => {
      // 비율 유지하며 리사이즈
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 이미지 그리기
      ctx.drawImage(img, 0, 0, width, height);

      // File로 변환
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 리사이즈 실패'));
            return;
          }

          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });

          resolve(resizedFile);
        },
        file.type,
        0.85 // 품질 85%
      );
    };

    img.onerror = () => {
      reject(new Error('이미지 로드 실패'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * 파일 해시 계산 (중복 방지용)
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // 16자리만 사용
}

/**
 * WebP 강제 변환 (canvas resize + toBlob image/webp)
 * 반환 File: type='image/webp', 파일명 .webp
 */
export async function optimizeToWebP(
  file: File,
  options: OptimizeToWebPOptions = {}
): Promise<File> {
  const formatCheck = validateImageFormat(file);
  if (!formatCheck.valid) {
    throw new Error(formatCheck.error);
  }
  const maxW = options.maxW ?? MAX_WIDTH;
  const maxH = options.maxH ?? MAX_HEIGHT;
  const quality = options.quality ?? 0.9;

  const img = await loadImage(file);
  const { width, height } = fitContain(img.width, img.height, maxW, maxH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context 생성 실패');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob 실패'))),
      'image/webp',
      quality
    );
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
  const webpName = `${baseName}.webp`;
  return new File([blob], webpName, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

/**
 * 이미지 최적화 (WebP 강제 통일)
 * slot: off1 | off2 | on1 | on2 (또는 레거시 off | on)
 * storagePath는 호출부에서 actionImagePath 등으로 생성 권장
 */
export async function optimizeImage(
  file: File,
  themeId: string,
  actionType: string,
  variant: SlotOrVariant
): Promise<OptimizeResult> {
  const formatCheck = validateImageFormat(file);
  if (!formatCheck.valid) {
    throw new Error(formatCheck.error);
  }

  const webpFile = await optimizeToWebP(file);

  const needsServerOptimization = webpFile.size > MAX_FILE_SIZE;
  const storagePath = `themes/${themeId}/actions/${actionType}/${variant}.webp`;

  return {
    file: webpFile,
    storagePath,
    needsServerOptimization,
  };
}

/**
 * 클라이언트 우선 이미지 최적화 (사용자 제공 구조)
 * 1) 타입 가드
 * 2) Canvas 리사이즈
 * 3) 500KB 초과면 서버 최적화 플래그 반환
 */
export async function optimizeImageClientFirst(file: File): Promise<Blob> {
  // 1) 타입 가드
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('png/jpg/webp만 업로드 가능합니다.');
  }

  // 2) Canvas 리사이즈
  const resized = await resizeToMax(file, MAX_WIDTH, MAX_HEIGHT);

  // 3) 500KB 초과면 서버 최적화(추후 API Route 연결 시 사용)
  return resized;
}

/**
 * 최대 크기로 리사이즈 (내부 헬퍼)
 */
async function resizeToMax(file: File, maxW: number, maxH: number): Promise<Blob> {
  const img = await loadImage(file);
  const { width, height } = fitContain(img.width, img.height, maxW, maxH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context 생성 실패');

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob 실패'))),
      'image/webp',
      0.9
    );
  });

  return blob;
}

/** Flow 파노라마(2:1) 최대 크기 - 업로드 전 재인코딩용 (해상도·검은 점 개선) */
const PANO_MAX_WIDTH = 8192;
const PANO_MAX_HEIGHT = 4096;

export interface ReencodePanoOptions {
  maxW?: number;
  maxH?: number;
  quality?: number;
}

/**
 * Flow 파노 이미지를 캔버스로 한 번 그린 뒤 동일 품질의 JPEG로 재인코딩.
 * 인코딩/프로그레시브/서브샘플링 차이로 Three.js에서 검정으로 나오는 문제를 방지.
 * 업로드 전에 호출해 모든 파노를 같은 방식의 JPEG로 통일할 때 사용.
 * 이미 올라간 파노는 품질/해상도 변경 후 재업로드해야 개선이 반영됨.
 * 출력 해상도는 maxW/maxH와 원본 크기 중 작은 쪽으로 결정되므로, 2월보다 3월이 흐리면 3월 원본 파일 해상도를 확인하고 재업로드할 것.
 */
export async function reencodePanoAsJpeg(
  file: File,
  options: ReencodePanoOptions = {}
): Promise<File> {
  const maxW = options.maxW ?? PANO_MAX_WIDTH;
  const maxH = options.maxH ?? PANO_MAX_HEIGHT;
  const quality = options.quality ?? 0.97;

  const img = await loadImage(file);
  const { width, height } = fitContain(img.width, img.height, maxW, maxH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context 생성 실패');
  // 다운스케일 시 보간 품질 향상 (원본이 max보다 클 때 선명도 유지)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob 실패'))),
      'image/jpeg',
      quality
    );
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'pano';
  const jpegName = `${baseName}.jpg`;
  return new File([blob], jpegName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export interface ReencodePanoPngOptions {
  maxW?: number;
  maxH?: number;
}

/**
 * Flow 파노 이미지를 캔버스로 그린 뒤 PNG로 재인코딩.
 * JPEG 4:2:0/블록 아티팩트로 인한 검은 점을 제거할 때 사용. (그라데이션 많은 바다/하늘에 유리)
 * 업로드 전 호출 시 동일 max 크기(8192×4096) 적용.
 */
export async function reencodePanoAsPng(
  file: File,
  options: ReencodePanoPngOptions = {}
): Promise<File> {
  const maxW = options.maxW ?? PANO_MAX_WIDTH;
  const maxH = options.maxH ?? PANO_MAX_HEIGHT;

  const img = await loadImage(file);
  const { width, height } = fitContain(img.width, img.height, maxW, maxH);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context 생성 실패');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob 실패'))),
      'image/png'
    );
  });

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'pano';
  const pngName = `${baseName}.png`;
  return new File([blob], pngName, {
    type: 'image/png',
    lastModified: Date.now(),
  });
}

/**
 * 비율 유지하며 최대 크기에 맞춤
 */
function fitContain(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

/**
 * 이미지 로드 (Promise 기반)
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}
