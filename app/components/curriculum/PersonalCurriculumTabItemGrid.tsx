'use client';

import { Play, Edit2, Trash2 } from 'lucide-react';
import { getSafePersonalThumbnailUrl } from '@/app/lib/curriculum/personalCurriculumThumbnails';

export type PersonalCurriculumTabGridItem = {
  id: number;
  url?: string;
  thumbnail?: string | null;
  title?: string;
};

type PersonalCurriculumTabItemGridProps = {
  items: PersonalCurriculumTabGridItem[];
  /** 현재 선택된 하위 탭 라벨(배지) */
  badgeLabel: string;
  variant: 'teacher' | 'admin';
  onCardClick: (item: PersonalCurriculumTabGridItem) => void;
  onEdit?: (item: PersonalCurriculumTabGridItem, e: React.MouseEvent) => void;
  onDelete?: (id: number, e: React.MouseEvent) => void;
};

export default function PersonalCurriculumTabItemGrid({
  items,
  badgeLabel,
  variant,
  onCardClick,
  onEdit,
  onDelete,
}: PersonalCurriculumTabItemGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => {
        const thumb = getSafePersonalThumbnailUrl(item);
        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            onClick={() => onCardClick(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick(item);
              }
            }}
          >
            {variant === 'admin' && (onEdit || onDelete) ? (
              <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item, e);
                    }}
                    className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-indigo-600 shadow-md"
                  >
                    <Edit2 size={16} />
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id, e);
                    }}
                    className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-md"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-200 flex items-center justify-center">
                  <Play size={28} className="text-slate-400" />
                </div>
              )}
            </div>
            <div className="p-4">
              <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wide mb-2">
                {badgeLabel}
              </span>
              <h3 className="text-base font-black text-slate-900 line-clamp-1">{item.title ?? badgeLabel}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
