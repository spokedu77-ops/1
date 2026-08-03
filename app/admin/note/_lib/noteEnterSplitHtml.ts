/**
 * C2 EnterMarks — mid-block Enter 뒤 HTML은 에디터 slice만 허용.
 * plain text → HTML 재파싱으로 marks를 대체하면 계약 위반.
 */

/** 커서 뒤 HTML: 에디터 slice가 있으면 그걸 쓰고, 빈 slice일 때만 plain rebuild 허용 */
export function resolveEnterAfterHtml(options: {
  afterHtmlFromEditor: string;
  afterText: string;
  plainRebuild: (text: string) => string;
}): string {
  const sliced = options.afterHtmlFromEditor.trim();
  if (sliced.length > 0 && sliced !== '<p></p>') {
    return options.afterHtmlFromEditor;
  }
  return options.plainRebuild(options.afterText);
}
