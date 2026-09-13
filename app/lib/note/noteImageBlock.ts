export type ImageBlockWidth = 'full' | 'half';
export type ImageBlockAlign = 'left' | 'center' | 'right';

export const IMAGE_WIDTH_OPTIONS: Array<{ id: ImageBlockWidth; label: string }> = [
  { id: 'full', label: '전체' },
  { id: 'half', label: '50%' },
];

export const IMAGE_ALIGN_OPTIONS: Array<{ id: ImageBlockAlign; label: string }> = [
  { id: 'left', label: '왼쪽' },
  { id: 'center', label: '가운데' },
  { id: 'right', label: '오른쪽' },
];

export const IMAGE_WIDTH_PERCENT_MIN = 25;
export const IMAGE_WIDTH_PERCENT_MAX = 100;

export function snapImageWidthPercent(percent: number): number {
  return Math.max(IMAGE_WIDTH_PERCENT_MIN, Math.min(IMAGE_WIDTH_PERCENT_MAX, Math.round(percent)));
}

export function readImageWidthPercent(content: Record<string, unknown> | null | undefined): number {
  const raw = content?.widthPercent;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return snapImageWidthPercent(raw);
  }
  return readImageWidth(content) === 'half' ? 50 : 100;
}

export function buildImageWidthPatch(percent: number): Pick<Record<string, unknown>, 'width' | 'widthPercent'> {
  const widthPercent = snapImageWidthPercent(percent);
  return {
    widthPercent,
    width: widthPercent <= 55 ? 'half' : 'full',
  };
}

export function imageFrameWidthStyle(percent: number): { width: string; maxWidth: string } {
  const widthPercent = snapImageWidthPercent(percent);
  return { width: `${widthPercent}%`, maxWidth: `${widthPercent}%` };
}

export function readImageWidth(content: Record<string, unknown> | null | undefined): ImageBlockWidth {
  return content?.width === 'half' ? 'half' : 'full';
}

export function readImageAlign(content: Record<string, unknown> | null | undefined): ImageBlockAlign {
  const align = content?.align;
  if (align === 'left' || align === 'right' || align === 'center') return align;
  return 'center';
}

export function imageFrameWidthClass(width: ImageBlockWidth): string {
  return width === 'half' ? 'w-1/2 max-w-[50%]' : 'w-full';
}

export function imageBlockAlignClass(align: ImageBlockAlign): string {
  if (align === 'left') return 'mr-auto';
  if (align === 'right') return 'ml-auto';
  return 'mx-auto';
}

export function imageCaptionAlignClass(align: ImageBlockAlign): string {
  if (align === 'left') return 'text-left';
  if (align === 'right') return 'text-right';
  return 'text-center';
}

export function defaultImageBlockContent(): Record<string, unknown> {
  return { url: '', caption: '', width: 'full', align: 'center' };
}
