/**
 * Flow Phase - 타입 정의
 */
export interface FlowDomRefs {
  progressBar: { current: HTMLDivElement | null };
  levelNum: { current: HTMLSpanElement | null };
  levelTag: { current: HTMLDivElement | null };
  instruction: { current: HTMLDivElement | null };
  introScreen: { current: HTMLDivElement | null };
  introTitle: { current: HTMLHeadingElement | null };
  startBtn: { current: HTMLButtonElement | null };
  hud: { current: HTMLDivElement | null };
  countdownOverlay: { current: HTMLDivElement | null };
  flashOverlay: { current: HTMLDivElement | null };
  speedLinesOverlay: { current: HTMLDivElement | null };
  /** 파노 로딩 상태 진단용 (좌상단 1줄) */
  panoDebugHud: { current: HTMLDivElement | null };
}
