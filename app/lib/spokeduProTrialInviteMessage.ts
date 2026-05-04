export type TrialInviteLeadFields = {
  contact_name: string;
  email: string | null;
};

export function buildTrialInviteMessageTemplate(lead: TrialInviteLeadFields, origin: string): string {
  const contactName = (lead.contact_name ?? '').trim() || '관장님';
  const email = (lead.email ?? '').trim() || '';
  const o = origin.replace(/\/$/, '');
  return `안녕하세요, ${contactName}님.
SPOKEDU PRO 베타 관장단 신청이 확인되어 14일 프리미엄 체험이 승인되었습니다.

아래 링크에서 신청하신 이메일(${email})로 로그인해 주세요.
반드시 신청하신 이메일(${email})과 동일한 이메일 계정으로 로그인해 주세요.
다른 이메일로 로그인하면 체험 권한이 연결되지 않습니다.

서비스 접속: ${o}/spokedu-pro

로그인 후 안내에 따라 도장 설정을 완료하면,
놀이체육 라이브러리와 SPOMOVE 반응훈련을 포함한 All-in-One 체험이 14일간 제공됩니다.

체험 제공:
- 놀이체육 라이브러리
- SPOMOVE 반응훈련
- 이번 주 도장 수업 추천 루틴

체험 종료 후 도입 여부를 선택하시면 됩니다.`;
}
