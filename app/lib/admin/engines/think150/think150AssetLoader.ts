/**
 * Think 150s Asset Loader
 * Intro에서 setA + setB 8개 URL 전체 preload + decode
 * getImageUrl(set, color) → 단순 lookup
 * 1주차: 색상만 / 2·3·4주차: 주차별 pack
 */

import type { ThinkPackSets, ThinkPackByWeek, ThinkPackByMonthAndWeek } from './types';
import type { PADColor } from '@/app/lib/admin/constants/padGrid';

export function getImageUrl(pack: ThinkPackSets | undefined, set: 'setA' | 'setB', color: PADColor): string {
  if (!pack) return '';
  return pack[set][color] ?? '';
}

/** setA 우선, 없으면 setB — pack에 있는 이미지가 있으면 그걸 사용 (Stage A/B 공통) */
export function getImageUrlAnySet(pack: ThinkPackSets | undefined, color: PADColor): string {
  if (!pack) return '';
  return pack.setA[color] ?? pack.setB[color] ?? '';
}

/** config에서 현재 week에 해당하는 pack 반환 (1주차=undefined) */
export function getPackForWeek(
  week: 1 | 2 | 3 | 4,
  thinkPack?: ThinkPackSets,
  thinkPackByWeek?: ThinkPackByWeek,
  month?: number,
  thinkPackByMonthAndWeek?: ThinkPackByMonthAndWeek
): ThinkPackSets | undefined {
  if (week === 1) return undefined;
  if (month != null && thinkPackByMonthAndWeek?.[month]) {
    const byWeek = thinkPackByMonthAndWeek[month]?.[`week${week}` as keyof ThinkPackByWeek];
    if (byWeek) return byWeek;
  }
  const byWeek = thinkPackByWeek?.[`week${week}` as keyof ThinkPackByWeek];
  return byWeek ?? thinkPack;
}

/** 8개 이미지 preload + decode (Intro 동안 호출) */
export async function preloadThinkPack(pack: ThinkPackSets): Promise<void> {
  const urls: string[] = [];
  for (const set of ['setA', 'setB'] as const) {
    for (const color of ['red', 'green', 'yellow', 'blue'] as PADColor[]) {
      const url = pack[set][color];
      if (url) urls.push(url);
    }
  }
  await Promise.all(
    urls.map((src) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          if (img.decode) {
            img.decode().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        };
        img.onerror = reject;
        img.src = src;
      });
    })
  );
}

/** thinkPackByWeek 전체 preload (2·3·4주차) */
export async function preloadThinkPackByWeek(packByWeek?: ThinkPackByWeek): Promise<void> {
  if (!packByWeek) return;
  for (const w of [2, 3, 4] as const) {
    const pack = packByWeek[`week${w}`];
    if (pack) await preloadThinkPack(pack).catch(() => {});
  }
}

/** thinkPackByMonthAndWeek 특정 월 preload */
export async function preloadThinkPackByMonth(
  packByMonth?: ThinkPackByMonthAndWeek,
  month?: number
): Promise<void> {
  if (!packByMonth || month == null) return;
  const byWeek = packByMonth[month];
  if (byWeek) await preloadThinkPackByWeek(byWeek);
}
