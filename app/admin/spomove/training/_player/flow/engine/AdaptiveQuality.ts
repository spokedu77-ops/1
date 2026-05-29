/**
 * Flow 2.0 — 적응형 품질
 * FPS 측정 → HIGH / MED / LOW 3단계 자동 전환
 * - 감지 창 30프레임(0.5초) → 빠른 반응
 * - DROP 임계값 상향 → 더 적극적으로 품질 낮춤
 */

export type QualityTier = 'HIGH' | 'MED' | 'LOW';

const FPS_SAMPLE      = 30;  // 0.5초 (빠른 감지)
const DROP_TO_MED     = 50;  // fps < 50 → MED (덜 끊기기 전에 미리 내림)
const DROP_TO_LOW     = 35;  // fps < 35 → LOW
const RECOVER_TO_HIGH = 58;
const RECOVER_TO_MED  = 45;

// 120/144hz 제한 — tier별 목표 fps
const TARGET_FPS: Record<QualityTier, number> = {
  HIGH: 60,
  MED:  60,
  LOW:  30,
};

export class AdaptiveQuality {
  private tier: QualityTier = 'HIGH';
  private fpsBuf: number[] = [];

  // shouldTick 축적기
  private tickAccum = 0;

  update(dt: number): void {
    if (dt <= 0) return;
    this.fpsBuf.push(1 / dt);
    if (this.fpsBuf.length > FPS_SAMPLE) this.fpsBuf.shift();
    if (this.fpsBuf.length < 10) return;

    const avg = this.fpsBuf.reduce((a, b) => a + b, 0) / this.fpsBuf.length;
    if      (this.tier === 'HIGH' && avg < DROP_TO_MED)     this.tier = 'MED';
    else if (this.tier === 'MED'  && avg < DROP_TO_LOW)     this.tier = 'LOW';
    else if (this.tier === 'LOW'  && avg > RECOVER_TO_MED)  this.tier = 'MED';
    else if (this.tier === 'MED'  && avg > RECOVER_TO_HIGH) this.tier = 'HIGH';
  }

  /**
   * 120/144hz에서 60fps(LOW=30fps)로 제한.
   * false이면 이번 RAF 프레임에서 물리·렌더를 모두 스킵한다.
   *
   * 사용법:
   *   const rawDt = clock.getDelta();
   *   if (!aq.shouldTick(rawDt)) return;
   *   // 이 아래부터 update + render
   */
  shouldTick(rawDt: number): boolean {
    this.tickAccum += rawDt;
    const target = 1 / TARGET_FPS[this.tier];
    if (this.tickAccum < target) return false;
    this.tickAccum -= target;
    // 탭 전환 등 긴 정지 후 폭주 방지
    if (this.tickAccum > target * 2) this.tickAccum = 0;
    return true;
  }

  /**
   * 바다 파도 꼭짓점 계산 여부.
   * oceanFrameIdx는 shouldTick()이 true를 반환한 프레임마다 1씩 증가시킨다.
   */
  shouldUpdateOcean(oceanFrameIdx: number): boolean {
    return oceanFrameIdx % this.getOceanUpdateFreq() === 0;
  }

  /**
   * i번째 스피드라인이 이 티어에서 업데이트 대상인지.
   * getSpeedLineCap() === 0(HIGH)이면 전체 업데이트.
   */
  isSpeedLineActive(idx: number): boolean {
    const cap = this.getSpeedLineCap();
    return cap === 0 || idx < cap;
  }

  getTier(): QualityTier { return this.tier; }

  getAvgFps(): number {
    if (!this.fpsBuf.length) return 60;
    return this.fpsBuf.reduce((a, b) => a + b, 0) / this.fpsBuf.length;
  }

  /** renderer.setPixelRatio 상한 */
  getPixelRatioMax(): number {
    if (this.tier === 'LOW') return 1;
    if (this.tier === 'MED') return 1.5;
    return Math.min(window.devicePixelRatio ?? 1, 2);
  }

  /** 별 개수 배율 */
  getStarCountScale(): number {
    if (this.tier === 'LOW') return 0.15;
    if (this.tier === 'MED') return 0.40;
    return 1;
  }

  /** 파편/코인 개수 배율 */
  getShardScale(): number {
    if (this.tier === 'LOW') return 0.2;
    if (this.tier === 'MED') return 0.5;
    return 1;
  }

  /** 활성 스피드라인 수 (0=전체) */
  getSpeedLineCap(): number {
    if (this.tier === 'LOW') return 5;
    if (this.tier === 'MED') return 20;
    return 0;
  }

  /** 파도 업데이트 주기 (N프레임마다 1회, 1=매프레임) */
  getOceanUpdateFreq(): number {
    if (this.tier === 'LOW') return 4;
    if (this.tier === 'MED') return 2;
    return 1;
  }

  /** 파티클 링 세그먼트 수 */
  getParticleSegments(): number {
    if (this.tier === 'LOW') return 6;
    if (this.tier === 'MED') return 12;
    return 24;
  }
}
