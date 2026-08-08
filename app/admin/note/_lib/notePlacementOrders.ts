/**
 * C5 Placement — inbound DnD/transfer 형제 삽입 위치.
 * 문서 종류(루트·하위·중첩 하위)와 무관하게 동일: 들어온 루트가 맨 위(최신), 기존은 아래로 밀림, 전체 0..n-1.
 */

export type NotePlacementOrderPatch = { id: string; order_index: number };

/** order_index 우선. 동점은 입력 만남 순서(stable) — id로 재섞지 않음 (ZERO LOSS #4) */
function sortByExistingOrder<T extends { id: string; order_index: number }>(blocks: ReadonlyArray<T>): T[] {
  return [...blocks].sort((left, right) => left.order_index - right.order_index);
}

/**
 * 기존 형제 + inbound 루트(시각 순) → prepend 후 유일 order_index.
 * inbound에 이미 있던 id는 기존 쪽에서 제외(재배치).
 */
export function resolveInboundTopPlacementOrders(
  existingSiblings: ReadonlyArray<{ id: string; order_index: number }>,
  inboundRootsInVisualOrder: ReadonlyArray<{ id: string }>,
): NotePlacementOrderPatch[] {
  const inboundIds = new Set(inboundRootsInVisualOrder.map((block) => block.id));
  const rest = sortByExistingOrder(existingSiblings).filter((block) => !inboundIds.has(block.id));
  const orderedIds = [
    ...inboundRootsInVisualOrder.map((block) => block.id),
    ...rest.map((block) => block.id),
  ];
  return orderedIds.map((id, order_index) => ({ id, order_index }));
}
