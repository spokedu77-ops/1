/**
 * Mobile TabBar geometry SSOT.
 * Inner row 62px + top pad 8px + bottom pad max(8px, safe-area).
 * Keep TabBar `fixed`; consumers reserve this clearance instead of leaving the flow.
 */
export const SPM_TABBAR_CLEARANCE =
  'calc(70px + max(8px, env(safe-area-inset-bottom, 0px)))';

export const SPM_TABBAR_CLEARANCE_VAR = '--spm-tabbar-clearance';
