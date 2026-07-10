export type MoleLookMode = 'classic' | 'variant';

export const MOLE_LOOKS_VARIANT = ['sunglasses', 'cap', 'topHat', 'bow'] as const;

export type MoleLook = 'default' | (typeof MOLE_LOOKS_VARIANT)[number];

export const MOLE_LOOKS: readonly MoleLook[] = ['default', ...MOLE_LOOKS_VARIANT];

export function pickRandomMoleLook(mode: MoleLookMode = 'classic'): MoleLook {
  if (mode === 'classic') return 'default';
  return MOLE_LOOKS_VARIANT[Math.floor(Math.random() * MOLE_LOOKS_VARIANT.length)]!;
}
