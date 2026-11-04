'use client';

import { useEffect, useState } from 'react';
import { Car, Check, Cherry, ImageIcon, Palette, PawPrint, Shuffle, TreePine, Utensils } from 'lucide-react';
import styles from './AssetHubUi.module.css';
import { SpomoveVariantFruitPanel } from '@/app/components/admin/assets/SpomoveVariantFruitPanel';
import { SpomoveVariantThemedSlotsPanel } from '@/app/components/admin/assets/SpomoveVariantThemedSlotsPanel';
import { useSpomoveVariantSlidesForTraining } from '@/app/admin/spomove/training/_player/hooks/useSpomoveVariantFruitSlidesForTraining';
import {
  SPOMOVE_COLOR_HUB_SECTIONS,
  SPOMOVE_COLOR_THEME_LABELS,
  SPOMOVE_COLOR_THEME_ORDER,
  SPOMOVE_THEMED_PACK_BY_THEME,
  SPOMOVE_VARIANT_THEME_LS_KEY,
  parseStoredVariantTheme,
  type SpomoveColorThemeId,
} from '@/app/admin/spomove/training/_player/lib/spomoveVariantThemeConfig';

type HubSectionId = (typeof SPOMOVE_COLOR_HUB_SECTIONS)[number]['id'];
const THEME_ICONS = { fruit: Cherry, animal: PawPrint, color: Palette, food: Utensils, nature: TreePine, vehicle: Car, mix: Shuffle, emotion: ImageIcon, dinosaur: PawPrint };

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
    <div className={styles.stack}>
      <div className={styles.sectionTabs} aria-label="색지각 자산 섹션">
        {SPOMOVE_COLOR_HUB_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.sectionTab}
            aria-pressed={section === s.id}
            onClick={() => setSection(s.id)}
          >
            {s.tabLabel}
          </button>
        ))}
      </div>

      {section === 'theme' && (
        <div className={styles.stack}>
          <p className={styles.description}>
            SPOMOVE 반응 인지 <strong>3·4·5번</strong>에서 쓸 이미지 묶음(테마)을 고릅니다. 아래에서
            테마를 선택하면 미리보기가 바뀌고, 트레이닝 설정에도 같은 선택이 반영됩니다. 자산은{' '}
            <strong>2~6번</strong> 탭에서 슬롯별로 올립니다.
          </p>
          <div className={styles.themeGrid}>
            {SPOMOVE_COLOR_THEME_ORDER.map((id) => {
              const Icon = THEME_ICONS[id];
              return (
              <button
                key={id}
                type="button"
                onClick={() => pickTheme(id)}
                className={styles.themeCard}
                aria-pressed={trainingTheme === id}
                aria-label={`${SPOMOVE_COLOR_THEME_LABELS[id]} 테마`}
              >
                <span className={styles.themeTop}>
                  <span className={styles.themeIcon}><Icon size={19} /></span>
                  {trainingTheme === id && <span className={styles.selectedBadge}><Check size={12} />훈련에 사용</span>}
                </span>
                <span className={styles.themeMeta}>테마</span>
                <span className={styles.themeTitle}>{SPOMOVE_COLOR_THEME_LABELS[id]}</span>
              </button>
            );})}
          </div>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>
              선택한 테마 미리보기 — <span className="text-cyan-300">{SPOMOVE_COLOR_THEME_LABELS[trainingTheme]}</span>
            </div>
            <p className={`${styles.muted} mt-1`}>업로드된 이미지가 여기에 나타납니다. (과일은 비운 슬롯은 기본 그림)</p>
            <div className={styles.previewGrid}>
              {previewSlides.map((s, i) => (
                <div
                  key={`${s.imageUrl}-${i}`}
                  className={styles.previewImage}
                >
                  <img src={s.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                </div>
              ))}
            </div>
            {previewSlides.length === 0 && <div className={styles.empty}><ImageIcon size={20} />등록된 미리보기 이미지가 없습니다.</div>}
          </div>
        </div>
      )}

      {section === 'fruit' && <SpomoveVariantFruitPanel />}
      {section === 'vehicle' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.vehicle} />}
      {section === 'emotion' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.emotion} />}
      {section === 'animal' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.animal} />}
      {section === 'nature' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.nature} />}
      {section === 'food' && <SpomoveVariantThemedSlotsPanel def={SPOMOVE_THEMED_PACK_BY_THEME.food} />}
    </div>
  );
}
