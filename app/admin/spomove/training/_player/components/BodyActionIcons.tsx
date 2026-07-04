'use client';
import React from 'react';

export type BodyActionId =
  | 'rightFoot'
  | 'leftFoot'
  | 'rightHand'
  | 'leftHand'
  | 'bothHands'
  | 'bothFeet';

export const BODY_ACTION_LABELS: Record<BodyActionId, string> = {
  rightFoot: '오른발',
  leftFoot: '왼발',
  rightHand: '오른손',
  leftHand: '왼손',
  bothHands: '양손',
  bothFeet: '양발',
};

const BODY_ACTION_IMAGE_SRC = {
  rightFoot: '/spomove/training/body-actions/right-foot.webp',
  leftFoot: '/spomove/training/body-actions/left-foot.webp',
  rightHand: '/spomove/training/body-actions/right-hand.webp',
  leftHand: '/spomove/training/body-actions/left-hand.webp',
  bothHands: '/spomove/training/body-actions/both-hands.webp',
  bothFeet: '/spomove/training/body-actions/both-feet.webp',
} satisfies Record<BodyActionId, string>;

const BODY_ACTION_IMAGE_URLS = Object.values(BODY_ACTION_IMAGE_SRC);

let didPreloadBodyActionImages = false;

function preloadBodyActionImages() {
  if (didPreloadBodyActionImages || typeof window === 'undefined') return;
  didPreloadBodyActionImages = true;

  const load = () => {
    for (const src of BODY_ACTION_IMAGE_URLS) {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      void image.decode?.().catch(() => {});
    }
  };

  const browserWindow = window;
  if ('requestIdleCallback' in browserWindow) {
    browserWindow.requestIdleCallback(load, { timeout: 1000 });
  } else {
    globalThis.setTimeout(load, 0);
  }
}

preloadBodyActionImages();

export function BodyActionIcon({
  actionId,
  style,
}: {
  actionId: BodyActionId;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={BODY_ACTION_IMAGE_SRC[actionId]}
      alt={BODY_ACTION_LABELS[actionId]}
      width={512}
      height={512}
      decoding="async"
      loading="eager"
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
        ...style,
      }}
    />
  );
}
