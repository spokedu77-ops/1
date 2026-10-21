// Preserves existing viewport directives, changing only the interactive-widget value.
// Used by the V2 release candidate only; no change to app/layout.tsx.
export function withNoteV2InteractiveViewport(current: string): string {
  const items = current.split(',').map((item) => item.trim()).filter(Boolean);
  const withoutWidget = items.filter((item) => !/^interactive-widget\s*=/i.test(item));
  withoutWidget.push('interactive-widget=resizes-content');
  return withoutWidget.join(', ');
}
