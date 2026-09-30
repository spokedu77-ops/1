import type { SessionWorkspacePresentationKind } from '../../activity/masterSessionWorkspaceModel';
import type { MasterSessionStatus } from '../../types/operational';

export function resolveSessionDisplayStatus(status: MasterSessionStatus, presentationKind: SessionWorkspacePresentationKind | null) {
  if (status === 'cancelled') return '취소';
  if (status === 'completed') return '완료';
  return presentationKind === 'RUN' || presentationKind === 'WRAP' || presentationKind === 'ATTENTION'
    ? '진행 중'
    : '예정';
}
