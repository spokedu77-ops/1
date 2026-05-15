import type { Metadata } from 'next';
import SpomoveHubView from './SpomoveHubView';
import { TrialGateWall } from '../components/ui/TrialGateWall';

export const metadata: Metadata = {
  title: 'SPOMOVE',
  description: '설치 없이 웹에서 바로 실행하는 화면 기반 반응훈련. 프로젝터, TV, 태블릿에서 수업 전 집중 전환과 몰입을 만듭니다.',
};

export default function SpokeduMasterSpomovePage() {
  return (
    <TrialGateWall feature="spomove">
      <SpomoveHubView />
    </TrialGateWall>
  );
}
