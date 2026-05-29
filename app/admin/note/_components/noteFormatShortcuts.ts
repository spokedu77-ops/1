export function formatShortcutLabel(keys: string): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);
  return keys
    .replace(/\bMod\b/g, isMac ? '⌘' : 'Ctrl')
    .replace(/\bAlt\b/g, isMac ? '⌥' : 'Alt')
    .replace(/\bShift\b/g, isMac ? '⇧' : 'Shift');
}

export const INLINE_MARK_SHORTCUTS = {
  bold: 'Mod+B',
  italic: 'Mod+I',
  underline: 'Mod+U',
  strike: 'Mod+Shift+S',
  code: 'Mod+E',
} as const;

export const TEXT_STYLE_SHORTCUTS = {
  paragraph: 'Mod+Alt+0',
  heading1: 'Mod+Alt+1',
  heading2: 'Mod+Alt+2',
  heading3: 'Mod+Alt+3',
} as const;
