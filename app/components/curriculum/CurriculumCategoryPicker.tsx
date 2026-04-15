'use client';

import { useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
  PERSONAL_CATEGORIES_ROW1,
  PERSONAL_CATEGORIES_ROW2,
  getSubTabsForCategory,
} from '@/app/lib/curriculum/constants';

export interface CurriculumCategoryPickerProps {
  category: string;
  subTab: string;
  onSelect: (category: string, subTab: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

const ALL_CATEGORIES = [...PERSONAL_CATEGORIES_ROW1, ...PERSONAL_CATEGORIES_ROW2];
const EIGHTH_SESSION_CATEGORY = '신체 기능향상 8회기';
const YUA_CATEGORY = '유아체육';

function getCategoryDisplayName(category: string) {
  if (category === EIGHTH_SESSION_CATEGORY) return '첫 8회기 루틴 프로그램';
  return category;
}

export default function CurriculumCategoryPicker({
  category,
  subTab,
  onSelect,
  open,
  onOpenChange,
  className = '',
}: CurriculumCategoryPickerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSelect = (cat: string, sub: string) => {
    onSelect(cat, sub);
    onOpenChange(false);
  };

  return (
    <div className={`w-full ${className}`}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all text-left font-bold text-slate-800 touch-manipulation min-h-[48px]"
      >
        <span className="truncate text-sm sm:text-base">
          {category === EIGHTH_SESSION_CATEGORY ? getCategoryDisplayName(category) : `${getCategoryDisplayName(category)} · ${subTab}`}
        </span>
        <ChevronDown
          size={20}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 바텀 시트: 모바일 풀폭 하단, 패드/PC는 중앙 카드형 */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-[320] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <div
            className="fixed left-0 right-0 bottom-0 z-[321] bg-white rounded-t-[24px] shadow-2xl flex flex-col max-h-[75vh] animate-in slide-in-from-bottom duration-300 ease-out
              sm:left-1/2 sm:right-auto sm:bottom-1/2 sm:top-auto sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-2xl sm:max-h-[85vh] sm:max-w-xl sm:w-full"
            role="dialog"
            aria-modal="true"
            aria-label="카테고리 선택"
          >
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-black text-slate-900">카테고리 선택</h3>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 touch-manipulation"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:pb-6 px-4 sm:px-6">
              {ALL_CATEGORIES.map((cat) => {
                const is8hui = cat === EIGHTH_SESSION_CATEGORY;
                const isYua = cat === YUA_CATEGORY;
                const subTabs = getSubTabsForCategory(cat);
                const isActiveCategory = cat === category;
                if (!is8hui && !isYua && subTabs.length === 0) return null;
                return (
                  <div key={cat} className="border-b border-slate-100 last:border-b-0">
                    {is8hui ? (
                      <button
                        type="button"
                        onClick={() => handleSelect(cat, '1-1')}
                        className={`w-full py-3 px-4 sm:px-6 text-left rounded-xl text-sm font-bold transition-all touch-manipulation
                          ${isActiveCategory ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
                      >
                        {getCategoryDisplayName(cat)}
                      </button>
                    ) : (
                      <>
                        {isYua ? (
                          <button
                            type="button"
                            onClick={() => handleSelect(cat, subTabs[0] ?? '')}
                            className={`w-full py-3 px-4 sm:px-6 text-left rounded-xl text-sm font-bold transition-all touch-manipulation
                              ${isActiveCategory ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}
                          >
                            {getCategoryDisplayName(cat)}
                          </button>
                        ) : (
                          <>
                            <div className="py-2.5 sm:py-3 bg-slate-50 -mx-4 sm:-mx-6 px-4 sm:px-6 text-xs font-black text-slate-500 uppercase tracking-wide sticky top-0">
                              {getCategoryDisplayName(cat)}
                            </div>
                            <div className="py-3 flex flex-wrap gap-2 sm:gap-2.5">
                              {subTabs.map((sub) => {
                                const isSelected = isActiveCategory && sub === subTab;
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSelect(cat, sub)}
                                    className={`px-3 py-2.5 sm:py-2 rounded-xl text-sm font-bold transition-all touch-manipulation
                                      ${isSelected
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                      }`}
                                  >
                                    {sub}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
