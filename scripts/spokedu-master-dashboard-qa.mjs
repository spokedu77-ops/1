/**
 * SPOKEDU MASTER 홈(대시보드) 스모크 — 라우팅·공개 경로
 * Usage: node scripts/spokedu-master-dashboard-qa.mjs http://localhost:3000
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

const checks = [
  { path: '/spokedu-master/dashboard', expectStatus: [307, 308], label: '비로그인 홈 보호' },
  { path: '/spokedu-master/landing', expectStatus: [200], label: '공개 랜딩' },
  { path: '/spokedu-master/payment', expectStatus: [200], label: '공개 결제' },
];

async function main() {
  let failed = 0;
  for (const { path, expectStatus, label } of checks) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    const ok = expectStatus.includes(res.status);
    console.log(`${ok ? 'OK' : 'FAIL'} ${label}: ${path} → ${res.status}`);
    if (!ok) failed += 1;
  }
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll routing checks passed.');
  console.log('Next: node scripts/spokedu-master-home-content-audit.mjs');
  console.log('Logged-in: SPOKEDU_MASTER_QA_ID=... SPOKEDU_MASTER_QA_PASSWORD=... node scripts/spokedu-master-home-logged-qa.mjs');
  console.log('Admin: /admin/spokedu-master/programs → 「8개 일괄 적용」 후 MASTER 홈 새로고침.');
  console.log('로그인 후 /spokedu-master/dashboard — 라이트 배경, 추천 row, 히어로·HOT 카드는 브라우저에서 확인하세요.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
