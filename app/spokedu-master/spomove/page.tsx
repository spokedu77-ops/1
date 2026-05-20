import type { Metadata } from 'next';
import { TrialGateWall } from '../components/ui/TrialGateWall';
import SpomoveHubView from './SpomoveHubView';

export const metadata: Metadata = {
  title: 'SPOMOVE',
  description: '빔, TV, 태블릿에서 바로 실행하는 화면 기반 반응훈련입니다. 라이브러리 수업과 연결해 몰입형 움직임 활동을 만듭니다.',
};

export default function SpokeduMasterSpomovePage() {
  return (
    <TrialGateWall feature="spomove">
      <SpomoveHubView />
    </TrialGateWall>
  );
}
