/** Scope selectors without changing media queries or animation declarations. */
export function scopePlayerCss(source: string): string {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  let cursor = 0, result = '';
  while (cursor < css.length) {
    const open = css.indexOf('{', cursor);
    if (open < 0) return result + css.slice(cursor);
    let close = open + 1, depth = 1;
    while (close < css.length && depth) { if (css[close] === '{') depth++; if (css[close] === '}') depth--; close++; }
    const header = css.slice(cursor, open).trim(), body = css.slice(open + 1, close - 1);
    if (/^@(?:media|supports|layer|container)\b/.test(header)) result += `${header}{${scopePlayerCss(body)}}`;
    else if (header.startsWith('@')) result += `${header}{${body}}`;
    else result += `${header.split(',').map(selector => {
      const s = selector.trim();
      if (s === ':root' || s === 'body') return '.spomove-player-root';
      if (s.startsWith('[data-theme=')) return `.spomove-player-root${s}`;
      if (s === '*' || s === '*::before' || s === '*::after') return `.spomove-player-root${s.slice(1)}, .spomove-player-root ${s}`;
      return `.spomove-player-root ${s}`;
    }).join(',')}{${body}}`;
    cursor = close;
  }
  return result;
}
