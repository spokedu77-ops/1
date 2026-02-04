/**
 * Seeded RNG for Think 150s - 디버그 재현 필수
 * 색 연속 방지: 같은 색이 연속될 확률 ~20% 이하
 * 4색 균형: 모든 색이 일정 비율로 출현
 */

export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]!;
  }

  /** 이전 색 제외 후 pick (연속 동일 방지) */
  pickExcluding<T>(arr: readonly T[], exclude: T | null): T {
    if (!exclude || arr.length <= 1) return this.pick(arr);
    const filtered = arr.filter((x) => x !== exclude);
    return filtered[Math.floor(this.next() * filtered.length)]!;
  }

  /** 여러 개 제외 후 pick */
  pickExcludingAll<T>(arr: readonly T[], excludes: T[]): T {
    const filtered = arr.filter((x) => !excludes.includes(x));
    return filtered.length > 0 ? filtered[Math.floor(this.next() * filtered.length)]! : this.pick(arr);
  }

  /** 연속 동일 확률 ~20%: 80%는 다른 색 선택 */
  pickAvoidingConsecutive<T>(arr: readonly T[], prev: T | null): T {
    if (!prev || arr.length <= 1) return this.pick(arr);
    if (this.next() < 0.2) return this.pick(arr);
    return this.pickExcluding(arr, prev);
  }

  /** 균형 + 연속 방지: 최소 등장 색 우선, 80% prev 제외 */
  pickBalanced(
    colors: readonly string[],
    counts: Record<string, number>,
    prev: string | null
  ): string {
    const minCount = Math.min(...colors.map((c) => counts[c] ?? 0));
    const candidates = colors.filter((c) => (counts[c] ?? 0) <= minCount);
    const pool =
      prev && candidates.length > 1 && this.next() >= 0.2
        ? candidates.filter((c) => c !== prev)
        : candidates;
    return pool[Math.floor(this.next() * pool.length)] ?? colors[0]!;
  }
}
