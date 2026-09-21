/**
 * HOME 이미지 역할 SSOT.
 * BRAND / SERVICE 는 연출(directed visual) 가능.
 * PROOF / PRODUCT 는 실제 자산만.
 */

export const HOME_IMAGE_ROLES = ['brand', 'service', 'proof', 'product'] as const;

export type HomeImageRole = (typeof HOME_IMAGE_ROLES)[number];

export type HomeImageOrigin = 'directed-visual' | 'field-photo' | 'product-ui';

export type HomeImageSlotId =
  | 'hero'
  | 'explorer-institution'
  | 'explorer-private'
  | 'explorer-subscription'
  | 'field-records'
  | 'built-field'
  | 'built-content'
  | 'built-system';

export type HomeImageSlot = {
  id: HomeImageSlotId;
  role: HomeImageRole;
  origin: HomeImageOrigin;
  directedVisualAllowed: boolean;
};

export const HOME_IMAGE_SLOTS: Record<HomeImageSlotId, HomeImageSlot> = {
  hero: {
    id: 'hero',
    role: 'brand',
    origin: 'directed-visual',
    directedVisualAllowed: true,
  },
  'explorer-institution': {
    id: 'explorer-institution',
    role: 'service',
    origin: 'directed-visual',
    directedVisualAllowed: true,
  },
  'explorer-private': {
    id: 'explorer-private',
    role: 'service',
    origin: 'directed-visual',
    directedVisualAllowed: true,
  },
  'explorer-subscription': {
    id: 'explorer-subscription',
    role: 'product',
    origin: 'product-ui',
    directedVisualAllowed: false,
  },
  'field-records': {
    id: 'field-records',
    role: 'proof',
    origin: 'field-photo',
    directedVisualAllowed: false,
  },
  'built-field': {
    id: 'built-field',
    role: 'proof',
    origin: 'field-photo',
    directedVisualAllowed: false,
  },
  'built-content': {
    id: 'built-content',
    role: 'proof',
    origin: 'product-ui',
    directedVisualAllowed: false,
  },
  'built-system': {
    id: 'built-system',
    role: 'product',
    origin: 'product-ui',
    directedVisualAllowed: false,
  },
};

export function assertHomeImageOriginAllowed(slotId: HomeImageSlotId, origin: HomeImageOrigin): void {
  const slot = HOME_IMAGE_SLOTS[slotId];
  if (origin === 'directed-visual' && !slot.directedVisualAllowed) {
    throw new Error(`HOME slot ${slotId} (${slot.role}) cannot use a directed visual`);
  }
}
