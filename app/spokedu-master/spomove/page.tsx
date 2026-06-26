import type { Metadata } from 'next';
import { TrialGateWall } from '../components/ui/TrialGateWall';
import SpomoveHubView from './SpomoveHubView';

export const metadata: Metadata = {
  title: 'SPOMOVE',
  description: '빔, TV, 태블릿에서 바로 실행하는 화면 기반 반응훈련입니다. 수업 자료와 별도로 바로 꺼내 쓰는 움직임 활동입니다.',
};

export default function SpokeduMasterSpomovePage() {
  return (
    <TrialGateWall feature="spomove">
      <SpomoveHubView />
    </TrialGateWall>
  );
}
