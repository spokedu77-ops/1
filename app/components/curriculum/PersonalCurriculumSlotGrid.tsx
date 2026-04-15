'use client';

import { Edit2, Trash2, Play } from 'lucide-react';
import { getPersonalCurriculumThumbnailUrl } from '@/app/lib/curriculum/personalCurriculumThumbnails';
import type { PersonalCurriculumSlotRow } from '@/app/lib/curriculum/personalCurriculumSlots';

export type PersonalCurriculumSlotGridItem = {
  id: number;
  category: string;
  sub_tab: string;
  url?: string;
  thumbnail?: string | null;
  title?: string;
  [key: string]: unknown;
};

export interface PersonalCurriculumSlotGridProps<
  T extends PersonalCurriculumSlotGridItem = PersonalCurriculumSlotGridItem,
> {
  slots: PersonalCurriculumSlotRow<T>[];
  variant: 'teacher' | 'admin';
  onSlotClick: (slot: PersonalCurriculumSlotRow<T>) => void;
  onAdminEdit?: (e: React.MouseEvent, slot: PersonalCurriculumSlotRow<T>) => void;
  onAdminDelete?: (e: React.MouseEvent, item: T) => void;
}

export default function PersonalCurriculumSlotGrid<
  T extends PersonalCurriculumSlotGridItem = PersonalCurriculumSlotGridItem,
>({ slots, variant, onSlotClick, onAdminEdit, onAdminDelete }: PersonalCurriculumSlotGridProps<T>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {slots.map(({ label, item }) => {
        const thumb = item ? getPersonalCurriculumThumbnailUrl(item) : '';
        const clickable = Boolean(item);
        const isAdmin = variant === 'admin';

        return (
          <div
            key={label}
            role="button"
            tabIndex={0}
            className={`group relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm transition-all duration-200 ${
              clickable || isAdmin
                ? 'hover:shadow-xl hover:border-indigo-200/60 hover:-translate-y-0.5 cursor-pointer'
                : 'opacity-60 cursor-default'
            }`}
            onClick={() => {
              if (clickable || isAdmin) onSlotClick({ label, item });
            }}
            onKeyDown={(e) => {
              if (!clickable && !isAdmin) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSlotClick({ label, item });
              }
            }}
          >
            {isAdmin && (onAdminEdit || onAdminDelete) ? (
              <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onAdminEdit ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdminEdit(e, { label, item });
                    }}
                    className="p-2 bg-white/95 backdrop-blur rounded-xl text-slate-600 hover:text-indigo-600 shadow-md"
                  >
                    <Edit2 size={16} />
                  </button>
                ) : null}
                {item && onAdminDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdminDelete(e, item);
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
                {label}
              </span>
              <h3 className="text-base font-black text-slate-900 line-clamp-1">{item?.title ?? label}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
