export type InlineMark = 'bold' | 'italic' | 'underline' | 'strike' | 'code';

const MARK_TOKENS: Record<InlineMark, { open: string; close: string }> = {
  bold: { open: '**', close: '**' },
  italic: { open: '*', close: '*' },
  underline: { open: '__', close: '__' },
  strike: { open: '~~', close: '~~' },
  code: { open: '`', close: '`' },
};

export type MarkApplyResult = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toggleInlineMark(
  text: string,
  mark: InlineMark,
  selectionStart: number,
  selectionEnd: number,
): MarkApplyResult {
  const source = text ?? '';
  const safeStart = clampRange(selectionStart, 0, source.length);
  const safeEnd = clampRange(selectionEnd, 0, source.length);
  const start = Math.min(safeStart, safeEnd);
  const end = Math.max(safeStart, safeEnd);
  const token = MARK_TOKENS[mark];

  if (start === end) {
    const inserted = `${source.slice(0, start)}${token.open}${token.close}${source.slice(end)}`;
    const caret = start + token.open.length;
    return { text: inserted, selectionStart: caret, selectionEnd: caret };
  }

  // 선택 영역 내부에 개행이 포함된 경우:
  // - 단일 토큰으로 감싸면 각 줄/경계가 어색해지고, undo/redo 시 손상 체감이 커짐
  // - 따라서 "바깥 감싸기"만 지원하고(현재 케이스), 내부 감싸기는 허용
  //   (나중에 라인별 토글이 필요하면 별도 기능으로 분리)
  const hasOuterWrapped =
    start >= token.open.length &&
    end + token.close.length <= source.length &&
    source.slice(start - token.open.length, start) === token.open &&
    source.slice(end, end + token.close.length) === token.close;
  if (hasOuterWrapped) {
    const nextText =
      `${source.slice(0, start - token.open.length)}${source.slice(start, end)}${source.slice(end + token.close.length)}`;
    const nextStart = start - token.open.length;
    return {
      text: nextText,
      selectionStart: nextStart,
      selectionEnd: nextStart + (end - start),
    };
  }

  const selected = source.slice(start, end);
  const hasWrapped = selected.startsWith(token.open) && selected.endsWith(token.close);
  if (hasWrapped && selected.length >= token.open.length + token.close.length) {
    const unwrapped = selected.slice(token.open.length, selected.length - token.close.length);
    const nextText = `${source.slice(0, start)}${unwrapped}${source.slice(end)}`;
    return {
      text: nextText,
      selectionStart: start,
      selectionEnd: start + unwrapped.length,
    };
  }

  const wrapped = `${token.open}${selected}${token.close}`;
  const nextText = `${source.slice(0, start)}${wrapped}${source.slice(end)}`;
  return {
    text: nextText,
    selectionStart: start + token.open.length,
    selectionEnd: start + token.open.length + selected.length,
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type MarkToken = {
  open: string;
  close: string;
  openTag: string;
  closeTag: string;
};

const PARSE_MARKS: MarkToken[] = [
  { open: '**', close: '**', openTag: '<strong>', closeTag: '</strong>' },
  { open: '__', close: '__', openTag: '<u>', closeTag: '</u>' },
  { open: '~~', close: '~~', openTag: '<s>', closeTag: '</s>' },
  { open: '*', close: '*', openTag: '<em>', closeTag: '</em>' },
];

function isEscaped(source: string, index: number): boolean {
  // index 위치의 문자가 '\'로 이스케이프됐는지 확인 (연속된 '\'의 홀짝)
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function parseTextSegmentToHtml(source: string): string {
  const out: string[] = [];
  const stack: { token: MarkToken; outIndex: number }[] = [];

  const pushText = (text: string) => {
    if (!text) return;
    out.push(escapeHtml(text));
  };

  let i = 0;
  while (i < source.length) {
    const ch = source[i];

    if (ch === '\n') {
      out.push('<br />');
      i += 1;
      continue;
    }

    // 이스케이프 문자: \* \_ \~ \` \[ \] 등을 literal로
    if (ch === '\\' && i + 1 < source.length) {
      pushText(source[i + 1]);
      i += 2;
      continue;
    }

    // 위키 링크 [[...]]
    if (source.startsWith('[[', i) && !isEscaped(source, i)) {
      const end = source.indexOf(']]', i + 2);
      if (end !== -1) {
        const title = source.slice(i + 2, end).trim();
        if (title) {
          out.push(`<span class="rounded bg-blue-50 px-1 text-blue-700">${escapeHtml(title)}</span>`);
        } else {
          pushText(source.slice(i, end + 2));
        }
        i = end + 2;
        continue;
      }
    }

    // 마크 토큰(굵게/밑줄/취소선/기울임) - 우선순위 순서대로 매칭
    const token = PARSE_MARKS.find((t) => source.startsWith(t.open, i) && !isEscaped(source, i));
    if (token) {
      const top = stack.at(-1);
      if (top?.token.open === token.open) {
        out.push(token.closeTag);
        stack.pop();
      } else {
        stack.push({ token, outIndex: out.length });
        out.push(token.openTag);
      }
      i += token.open.length;
      continue;
    }

    // 일반 문자
    pushText(ch);
    i += 1;
  }

  // 닫히지 않은 토큰은 literal로 되돌림(최소한의 안전성)
  for (let s = stack.length - 1; s >= 0; s -= 1) {
    const { token, outIndex } = stack[s];
    out[outIndex] = escapeHtml(token.open);
  }

  return out.join('');
}

/**
 * 단순/경량 마크업 렌더러
 * - 목표: 빠른 미리보기(노션 완전 호환 X)
 */
export function parseInlineMarkupToHtml(input: string): string {
  const source = input ?? '';
  const out: string[] = [];

  // code span(`...`)은 내부 마크업을 무시하고 그대로 렌더
  let i = 0;
  while (i < source.length) {
    const backtick = source.indexOf('`', i);
    if (backtick === -1) {
      out.push(parseTextSegmentToHtml(source.slice(i)));
      break;
    }
    if (isEscaped(source, backtick)) {
      // escaped backtick은 일반 문자로 처리되도록 한 글자씩 전진
      out.push(parseTextSegmentToHtml(source.slice(i, backtick + 1)));
      i = backtick + 1;
      continue;
    }

    // backtick 이전 일반 텍스트
    if (backtick > i) out.push(parseTextSegmentToHtml(source.slice(i, backtick)));

    const end = source.indexOf('`', backtick + 1);
    if (end === -1 || isEscaped(source, end)) {
      // 닫힘이 없으면 나머지는 일반 텍스트
      out.push(parseTextSegmentToHtml(source.slice(backtick)));
      break;
    }

    const codeText = source.slice(backtick + 1, end);
    out.push(
      `<code class="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">${escapeHtml(codeText)}</code>`,
    );
    i = end + 1;
  }

  return out.join('');
}

export function extractWikiLinks(input: string): string[] {
  const source = input ?? '';
  const regex = /\[\[([^[\]]+)\]\]/g;
  const links = new Set<string>();
  let match: RegExpExecArray | null = regex.exec(source);
  while (match) {
    const title = (match[1] ?? '').trim();
    if (title) links.add(title);
    match = regex.exec(source);
  }
  return [...links];
}

