/**
 * @deprecated 노션 계약상 todo 중첩은 planBlockTabIndent → parent_block_id.
 * listNestLevel 경로는 제거됨. 로드 시 migrateTodoListNestLevelsToTree 사용.
 */
export function planTodoListNestTab(
  _blocks: unknown,
  _blockId: string,
  _direction: 'in' | 'out',
): null {
  return null;
}
