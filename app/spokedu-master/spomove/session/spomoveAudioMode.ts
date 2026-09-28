export type SpomoveUserAudioMode = 'full' | 'effects' | 'silent';
export type SpomoveResolvedAudioMode = SpomoveUserAudioMode | 'music';

export type SpomoveAudioChannels = {
  effectsEnabled: boolean;
  bgmEnabled: boolean;
};

const AUDIO_MODES = new Set<SpomoveResolvedAudioMode>(['full', 'effects', 'silent', 'music']);

export function parseSpomoveAudioMode(value: string | null | undefined): SpomoveResolvedAudioMode | null {
  return value && AUDIO_MODES.has(value as SpomoveResolvedAudioMode)
    ? value as SpomoveResolvedAudioMode
    : null;
}

export function legacyPairToSpomoveAudioMode(
  soundEnabled: boolean,
  bgmPath: string,
): SpomoveResolvedAudioMode {
  if (soundEnabled) return bgmPath ? 'full' : 'effects';
  return bgmPath ? 'music' : 'silent';
}

export function spomoveAudioModeToChannels(mode: SpomoveResolvedAudioMode): SpomoveAudioChannels {
  return {
    effectsEnabled: mode === 'full' || mode === 'effects',
    bgmEnabled: mode === 'full' || mode === 'music',
  };
}

export function spomoveAudioModeToLegacyPair(
  mode: SpomoveResolvedAudioMode,
  bgmPath: string,
): { soundEnabled: boolean; bgmPath: string } {
  const channels = spomoveAudioModeToChannels(mode);
  return {
    soundEnabled: channels.effectsEnabled,
    bgmPath: channels.bgmEnabled ? bgmPath : '',
  };
}

export function userAudioModeWithBgmAvailability(
  mode: SpomoveUserAudioMode,
  bgmAvailable: boolean,
): SpomoveUserAudioMode {
  return mode === 'full' && !bgmAvailable ? 'effects' : mode;
}