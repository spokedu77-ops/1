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
  rightFoot: '/spomove/training/body-actions/right-foot.png',
  leftFoot: '/spomove/training/body-actions/left-foot.png',
  rightHand: '/spomove/training/body-actions/right-hand.png',
  leftHand: '/spomove/training/body-actions/left-hand.png',
  bothHands: '/spomove/training/body-actions/both-hands.png',
  bothFeet: '/spomove/training/body-actions/both-feet.png',
} satisfies Record<BodyActionId, string>;

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
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
