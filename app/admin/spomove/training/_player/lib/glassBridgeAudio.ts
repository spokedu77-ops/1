/** Session-owned Web Audio nodes. No audio is created when effects are off. */
export function createGlassBridgeAudio(enabled: boolean) {
  let context: AudioContext | undefined;
  const nodes = new Set<AudioScheduledSourceNode>();
  const play = (kind: 'flash' | 'go' | 'success' | 'shatter', color = 0) => {
    if (!enabled) return;
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') void context.resume().catch(() => {});
      const time = context.currentTime; const gain = context.createGain(); gain.connect(context.destination);
      const source = kind === 'shatter' ? context.createBufferSource() : context.createOscillator();
      if (source instanceof AudioBufferSourceNode) {
        const buffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        source.buffer = buffer;
      } else {
        source.type = kind === 'success' ? 'triangle' : 'sine';
        source.frequency.setValueAtTime(kind === 'flash' ? [523.25, 659.25, 783.99, 1046.5][color % 4]! : 440, time);
        if (kind === 'success') source.frequency.exponentialRampToValueAtTime(1046.5, time + 0.3);
      }
      const duration = kind === 'shatter' ? 1.5 : kind === 'flash' ? 0.5 : 0.8;
      source.connect(gain); gain.gain.setValueAtTime(0.15, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      nodes.add(source); source.onended = () => { nodes.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(time); source.stop(time + duration);
    } catch { /* Audio unavailability does not interrupt a teacher-led task. */ }
  };
  return { play, close: () => {
    for (const node of nodes) { try { node.stop(); node.disconnect(); } catch { /* already ended */ } }
    nodes.clear(); if (context) void context.close().catch(() => {}); context = undefined;
  } };
}
