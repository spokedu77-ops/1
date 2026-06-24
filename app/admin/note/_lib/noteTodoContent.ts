/** 노션 todo: text + checked(boolean)만 본문 메타로 취급 */
export function normalizeTodoBlockContentRecord(
  content: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...content,
    text: typeof content.text === 'string' ? content.text : '',
    checked: content.checked === true,
  };
}

export function resolveTodoChecked(
  content: Record<string, unknown> | null | undefined,
): boolean {
  return content?.checked === true;
}

export function patchTodoChecked(
  content: Record<string, unknown>,
): Record<string, unknown> {
  return normalizeTodoBlockContentRecord({
    ...content,
    checked: !resolveTodoChecked(content),
  });
}
