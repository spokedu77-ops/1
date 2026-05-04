import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPOKEDU PRO 베타 관장단 신청',
  description:
    '유아·초등부 수업을 강화하고 싶은 태권도장 관장님을 위한 베타 관장단 신청. 신청 후 운영팀이 14일 프리미엄 체험 및 도입을 안내합니다.',
};

export default function ProApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
