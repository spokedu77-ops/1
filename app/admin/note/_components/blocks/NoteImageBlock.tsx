'use client';

import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCallback, useRef, type RefObject } from 'react';
import {
  IMAGE_ALIGN_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  buildImageWidthPatch,
  imageBlockAlignClass,
  imageCaptionAlignClass,
  imageFrameWidthStyle,
  readImageAlign,
  readImageWidthPercent,
} from '../../_lib/noteImageBlock';
import { NoteChromeBlockShell } from './NoteChromeBlockShell';

type NoteImageBlockProps = {
  url: string;
  caption: string;
  liveContent: Record<string, unknown>;
  contentMarginLeft: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  imgDragOver: boolean;
  imgUploading: boolean;
  showUrlInput: boolean;
  isFocused: boolean;
  autoFocusSignal?: number;
  setImgDragOver: (value: boolean) => void;
  setImgUploading: (value: boolean) => void;
  setShowUrlInput: (value: boolean) => void;
  patchContent: (patch: Record<string, unknown>) => void;
  uploadImage?: (file: File) => Promise<string>;
  onAddBelow: () => void;
  onDelete: () => void;
  onOpenLightbox: (url: string, caption?: string) => void;
};

export function NoteImageBlock({
  url,
  caption,
  liveContent,
  contentMarginLeft,
  fileInputRef,
  imgDragOver,
  imgUploading,
  showUrlInput,
  isFocused,
  autoFocusSignal = 0,
  setImgDragOver,
  setImgUploading,
  setShowUrlInput,
  patchContent,
  uploadImage,
  onAddBelow,
  onDelete,
  onOpenLightbox,
}: NoteImageBlockProps) {
  const imageWidthPercent = readImageWidthPercent(liveContent);
  const imageAlign = readImageAlign(liveContent);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const handleImageFile = async (file: File) => {
    if (!uploadImage) return;
    if (!file.type.startsWith('image/')) return;
    setImgUploading(true);
    try {
      const uploaded = await uploadImage(file);
      patchContent({ url: uploaded });
    } finally {
      setImgUploading(false);
    }
  };

  const startImageResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shell = imageFrameRef.current?.parentElement;
    if (!shell) return;
    const shellWidth = shell.getBoundingClientRect().width;
    if (shellWidth <= 0) return;
    const startX = e.clientX;
    const startPercent = imageWidthPercent;

    const onMove = (ev: MouseEvent) => {
      const deltaPercent = ((ev.clientX - startX) / shellWidth) * 100;
      patchContent(buildImageWidthPatch(startPercent + deltaPercent));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [imageWidthPercent, patchContent]);

  if (!url) {
    return (
      <div
        className={`group relative overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          imgDragOver ? 'border-blue-400 bg-blue-50' : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
        }`}
        style={{ marginLeft: `${contentMarginLeft}px` }}
        onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
        onDragLeave={() => setImgDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setImgDragOver(false);
          const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
          if (file) await handleImageFile(file);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleImageFile(file);
            e.target.value = '';
          }}
        />

        {imgUploading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[13px]">업로드 중…</span>
          </div>
        ) : showUrlInput ? (
          <div className="p-4">
            <p className="mb-2 text-[12px] font-medium text-neutral-500">이미지 URL</p>
            <div className="flex gap-2">
              <input
                autoFocus
                className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-[14px] outline-none focus:border-neutral-400"
                placeholder="https://..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) patchContent({ url: val });
                    setShowUrlInput(false);
                  }
                  if (e.key === 'Escape') setShowUrlInput(false);
                }}
              />
              <button type="button" onClick={() => setShowUrlInput(false)} className="rounded-md px-3 py-2 text-[13px] text-neutral-400 hover:bg-neutral-100">취소</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200">
              <ImageIcon className="h-5 w-5 text-neutral-500" />
            </div>
            <p className="text-[14px] font-medium text-neutral-600">이미지 추가</p>
            <p className="text-[12px] text-neutral-400">드래그하거나 클릭해서 업로드</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-neutral-800"
              >
                파일 선택
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50"
              >
                URL 입력
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <NoteChromeBlockShell
      isFocused={isFocused}
      autoFocusSignal={autoFocusSignal}
      className="group relative"
      style={{ marginLeft: `${contentMarginLeft}px` }}
      onAddBelow={onAddBelow}
      onDelete={onDelete}
    >
      <div
        ref={imageFrameRef}
        className={`relative ${imageBlockAlignClass(imageAlign)}`}
        style={imageFrameWidthStyle(imageWidthPercent)}
      >
        <div
          className="relative overflow-hidden rounded-lg bg-neutral-100"
          onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
          onDragLeave={() => setImgDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setImgDragOver(false);
            const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
            if (file) await handleImageFile(file);
          }}
        >
          <img
            src={url}
            alt={caption || ''}
            className="w-full cursor-zoom-in object-contain"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLightbox(url, caption || undefined);
            }}
          />
          {imgDragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-500/20 text-[14px] font-medium text-blue-700">
              이미지 교체
            </div>
          )}
          {imgUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            </div>
          )}
          <button
            type="button"
            aria-label="이미지 크기 조절"
            className="absolute bottom-2 right-2 hidden h-5 w-5 cursor-ew-resize rounded-sm border border-white/90 bg-neutral-900/75 shadow-sm group-hover:block"
            onMouseDown={startImageResize}
          />
          <div className="absolute right-2 top-2 hidden flex-col items-end gap-1 group-hover:flex">
            <div className="flex items-center gap-1 rounded-md bg-white/95 p-1 shadow-sm">
              {IMAGE_WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => patchContent(buildImageWidthPatch(option.id === 'half' ? 50 : 100))}
                  className={`rounded px-2 py-1 text-[11px] font-medium ${
                    (option.id === 'half' ? imageWidthPercent <= 55 : imageWidthPercent > 55)
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-md bg-white/95 p-1 shadow-sm">
              {IMAGE_ALIGN_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => patchContent({ align: option.id })}
                  className={`rounded px-2 py-1 text-[11px] font-medium ${
                    imageAlign === option.id
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleImageFile(f); e.target.value = ''; }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-white/90 px-2.5 py-1.5 text-[12px] font-medium text-neutral-600 shadow-sm hover:bg-white">
                교체
              </button>
            </div>
          </div>
        </div>
        <input
          value={caption}
          onChange={(e) => patchContent({ caption: e.target.value })}
          placeholder="캡션 추가"
          className={`mt-1.5 w-full bg-transparent text-[13px] text-neutral-400 outline-none placeholder:text-neutral-300 focus:text-neutral-600 ${imageCaptionAlignClass(imageAlign)}`}
        />
      </div>
    </NoteChromeBlockShell>
  );
}
