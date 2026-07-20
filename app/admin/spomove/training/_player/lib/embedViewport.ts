import type { CSSProperties } from 'react';

/** MASTER embed / 훈련 전체화면 — iOS Safari 주소창 대응 */
export const EMBED_FIXED_VIEWPORT: CSSProperties = {
  position: 'fixed',
  inset: 0,
  height: '100dvh',
  maxHeight: '100dvh',
};

export const EMBED_SAFE_TOP = 'max(1.25rem, env(safe-area-inset-top))';
export const EMBED_SAFE_BOTTOM = 'max(1.5rem, env(safe-area-inset-bottom))';

/** reactTrain 계열 HUD·패드 공통 보정 */
export const REACT_TRAIN_VIEWPORT_CSS = `
@media (max-height:600px){
  .rmt{--hud-h:56px}
  .bwt-hud,.rrt-hud,.rmt-hud,.camo-hud,.wh-hud,.ncart-hud,.ctrk-hud{height:56px!important}
  .rrt-pads{height:clamp(58px,9vh,72px)!important;padding-bottom:max(0px,env(safe-area-inset-bottom))}
  #vrt-pads{--pad-h:58px}
}
@media (max-width:380px){
  .bwt-hc.grow,.rrt-hc.grow,.rmt-hc.grow,.camo-hc.grow,.wh-hc.grow,.ncart-hc.grow,.ctrk-hc.grow{display:none}
  .bwt-stop,.rrt-stop,.rmt-stop,.camo-stop,.wh-stop,.ncart-stop,.ctrk-stop{padding:6px 10px!important;font-size:11px!important}
}
`;
