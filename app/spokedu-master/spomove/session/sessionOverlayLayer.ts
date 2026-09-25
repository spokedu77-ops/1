/**
 * SPOMOVE engine runtimes paint as viewport-fixed layers around 300–320.
 * Session dialogs must stay above those layers without lowering engine z-index.
 */
export const SPOMOVE_SESSION_ENGINE_LAYER = 320;
export const SPOMOVE_SESSION_OVERLAY_LAYER = 1000;
