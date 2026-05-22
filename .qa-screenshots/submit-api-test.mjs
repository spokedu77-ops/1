const base = 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const privateBody = {
  type: 'private',
  name: 'QA테스트',
  phone: '010-1111-2222',
  content: [
    '[개인·소그룹 수업 문의]',
    '이름: QA테스트',
    '연락처: 010-1111-2222',
    '희망 지역: 서울',
    '아이 연령: 8세',
    '희망 수업 형태: 1:1',
    '희망 장소: LAB',
  ].join('\n'),
};

const dispatchNoEmail = {
  type: 'dispatch',
  organization: 'QA기관',
  manager: 'QA담당',
  phone: '010-3333-4444',
  email: '',
  location: '경기',
  headcount: '20',
  programs: ['정규수업'],
  targetAge: ['초등'],
  inquiry: '기관 QA',
  source: 'qa',
};

const dispatchNoPhone = {
  ...dispatchNoEmail,
  phone: '',
  email: 'qa@test.com',
};

const curriculumNoEmail = {
  type: 'curriculum',
  name_or_org: 'QA소속',
  phone: '010-5555-6666',
  content_type: '수업안',
  target_age: '서울',
  purpose: '내부 운영',
  teacher_training: '검토 중',
  partnership_type: '내부 운영',
  extra: 'QA extra',
};

const results = {
  private: await post('/api/private/leads', privateBody),
  dispatchPhoneOnly: await post('/api/dispatch/leads', dispatchNoEmail),
  dispatchEmailOnly: await post('/api/dispatch/leads', dispatchNoPhone),
  curriculum: await post('/api/curriculum/leads', curriculumNoEmail),
};

console.log(JSON.stringify(results, null, 2));
