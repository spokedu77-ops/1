export type CamouflagePlacementMode = 'center' | 'variant';
export type CamouflagePlacementResponse = 'legacy' | 'preset';

/**
 * MASTER Simon L4 Camouflage 배치.
 * honor(preset)가 없으면 기존 Public 동작: 항상 variant.
 */
export function resolveSimonL4CamouflagePlacementMode(input: {
  camouflagePlacement?: CamouflagePlacementMode;
  camouflagePlacementResponse?: CamouflagePlacementResponse;
}): CamouflagePlacementMode {
  if (input.camouflagePlacementResponse === 'preset') {
    return input.camouflagePlacement === 'center' ? 'center' : 'variant';
  }
  return 'variant';
}

export function resolveSimonL4CamouflageConcurrent(simonPoleCount: 1 | 2 | undefined): 1 | 2 {
  return simonPoleCount === 2 ? 2 : 1;
}
