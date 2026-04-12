'use client';

import { useEffect, useState } from 'react';
import { SpomoveVariantFruitPanel } from '@/app/components/admin/assets/SpomoveVariantFruitPanel';
import { SpomoveVariantThemedSlotsPanel } from '@/app/components/admin/assets/SpomoveVariantThemedSlotsPanel';
import { useSpomoveVariantSlidesForTraining } from '@/app/admin/memory-game/hooks/useSpomoveVariantFruitSlidesForTraining';
import {
  SPOMOVE_COLOR_HUB_SECTIONS,
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_COLOR_THEME_ORDER,
  SPOMOVE_THEMED_PACK_BY_THEME,
  SPOMOVE_VARIANT_THEME_LS_KEY,
  parseStoredVariantTheme,
  type SpomoveColorThemeId,
} from '@/app/admin/memory-game/lib/spomoveVariantThemeConfig';

type HubSectionId = (typeof SPOMOVE_COLOR_HUB_SECTIONS)[number]['id'];

export function SpomoveColorPerceptionPanel() {
  const [section, setSection] = useState<HubSectionId>('theme');
  const [trainingTheme, setTrainingTheme] = useState<SpomoveColorThemeId>('fruit');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTrainingTheme(parseStoredVariantTheme(localStorage.getItem(SPOMOVE_VARIANT_THEME_LS_KEY)));
  }, []);

  const pickTheme = (t: SpomoveColorThemeId) => {
    setTrainingTheme(t);
    if (typeof window !== 'undefined') localStorage.setItem(SPOMOVE_VARIANT_THEME_LS_KEY, t);
  };

  const { slides: previewSlides } = useSpomoveVariantSlidesForTraining(trainingTheme);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-neutral-700 bg-neutral-900/50 p-1">
        {SPOMOVE_COLOR_HUB_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              section === s.id ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
            onClick={() => setSection(s.id)}
          >
            {s.tabLabel}
          </button>
        ))}
      </div>

      {section === 'theme' && (
        <div className="space-y-6">
          <p className="text-sm text-neutral-400">
            SPOMOVE 반응 인지 <strong className="text-neutral-200">3·4·5번</strong>에서 쓸 이미지 묶음(테마)을 고릅니다. 아래에서
            테마를 선택하면 미리보기가 바뀌고, 트레이닝 설정에도 같은 선택이 반영됩니다. 자산은{' '}
            <strong className="text-neutral-200">2~5번</strong> 탭에서 슬롯별로 올립니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SPOMOVE_COLOR_THEME_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pickTheme(id)}
                className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                  trainingTheme === id
                    ? 'border-orange-500/80 bg-orange-500/15 text-white'
                    : 'border-neutral-600 bg-neutral-900/50 text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <div className="text-xs font-bold text-neutral-500">테마</div>
                <div className="mt-1 text-lg font-extrabold">{SPOMOVE_COLOR_THEME_LABELS[id]}</div>
                {trainingTheme === id && <div className="mt-2 text-xs font-semibold text-orange-300">✓ 훈련에 사용</div>}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-2 text-sm font-bold text-neutral-300">
              선택한 테마 미리보기 — <span className="text-orange-300">{SPOMOVE_COLOR_THEME_LABELS[trainingTheme]}</span>
            </div>
            <p className="mb-3 text-xs text-neutral-500">업로드된 이미지가 여기에 나타납니다. (과일은 비운 슬롯은 기본 그림)</p>
            <div className="flex flex-wrap gap-2">
              {previewSlides.map((s, i) => (
                <div
                  key={`${s.imageUrl}-${i}`}
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-neutral-600 bg-black"
                >
                  <img src={s.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'fruit' && <SpomoveVariantFruitPanel />}
      {section === 'vehicle' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.vehicle} />}
      {section === 'emotion' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.emotion} />}
      {section === 'animal' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.animal} />}
    </div>
  );
}
