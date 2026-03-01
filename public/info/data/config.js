/**
 * ✅ 운영자가 수정하는 유일한 파일
 * CONFIG, SLIDES_DATA, SLOTS, REPORT_METRICS
 */

const CONFIG = Object.freeze({
  center: {
    name: "SPOKEDU LAB",
    tagline: "",
    address: "서울시 강동구 성내동 430-2, 7층 2호",
    hours: "평일 13:00–20:00 / 토 10:00–15:00",
    privacyUrl: "javascript:void(0)",
  },
  phoneParts: ["010", "0000", "0000"],
  kakao: {
    webUrl: "http://pf.kakao.com/_VGWxeb/chat",
    deepLink: "",
  },
  leadEndpoint: "https://script.google.com/macros/s/AKfycbwja8ZzKpyyNuRuPoBz6Mkp_SzHf0Bh9rGraip3GnHwPicOhadsZaoTYThcnAa_5OBfnw/exec",
});

const SLIDES_DATA = [
  { src: "https://i.postimg.cc/fTCDRxtD/daunlodeu.jpg", svgTheme: { col1: "#C8F34A", col2: "#8BE9FF" }, title: "공간/안전", heading: "안전 동선 · 공간 구성", body: "활동 구역/대기 구역 분리 · 정원 운영 · 규범 루틴", subtitle: "안전 동선 · 정원 운영 · 규범 루틴", note: "수업 환경" },
  { src: null, svgTheme: { col1: "#8BE9FF", col2: "#C8F34A" }, title: "수업 구조", heading: "50분 정규수업", body: "Check-in → Warm-up → Skill(FMS) → Game → Wrap-up", subtitle: "50분 안에 '학습 루틴' 완결", note: "수업 흐름" },
  { src: "https://i.postimg.cc/Qd7mqqpY/20250303-101124.jpg", svgTheme: { col1: "#FFC75A", col2: "#8BE9FF" }, title: "멀티스포츠", heading: "게임 기반 멀티스포츠", body: "규칙 이해 · 역할 수행 · 협동/커뮤니케이션", subtitle: "종목 '경험'이 아니라 '역량'으로 남게", note: "게임 기반" },
  { src: null, svgTheme: { col1: "#C8F34A", col2: "#8BE9FF" }, title: "분기 단위", heading: "12주(1분기) 운영", body: "적응 → 누적 → 중간점검 → 분기 리포트", subtitle: "'매주 새로움'보다 '누적 학습'", note: "12주 설계" },
  { src: "https://i.postimg.cc/DzFrP3fw/20260301-215543.png", svgTheme: { col1: "#8BE9FF", col2: "#C8F34A" }, title: "리포트", heading: "성장 리포트(샘플)", body: "관찰 → 기준표 → 다음 목표", subtitle: "설명 가능한 운영(학원 신뢰의 핵심)", note: "분기 리포트" },
  { src: "https://i.postimg.cc/LXWg7cSc/gangdong-gu-bogeonso-biman-yebang-chelyeoghyangsang-sueob-9.jpg", svgTheme: { col1: "#C8F34A", col2: "#8BE9FF" }, title: "코칭", heading: "피드백은 '동작'이 아니라 '학습'이다", body: "관찰 → 짧은 피드백 → 재시도 → 정리", subtitle: "아이의 '재시도'를 설계", note: "코칭 방식" },
];

const SLOTS = [
  { id: "mon-1700-e13", day: "월", time: "17:00", age: "초등(1–3)", title: "기초 움직임 + 룰게임", status: "open" },
  { id: "wed-1700-e13", day: "수", time: "17:00", age: "초등(1–3)", title: "반응·협응 + 미션", status: "limited" },
  { id: "fri-1700-e46", day: "금", time: "17:00", age: "초등(4–6)", title: "멀티스포츠 통합", status: "open" },
  { id: "sat-1000-k57", day: "토", time: "10:00", age: "유아(5–7)", title: "놀이체육(기초발달)", status: "open" },
  { id: "sat-1100-e13", day: "토", time: "11:00", age: "초등(1–3)", title: "기초 + 게임전개", status: "wait" },
];

const REPORT_METRICS = [
  { key: "Landing Stability", value: 72 },
  { key: "Balance", value: 66 },
  { key: "Reaction", value: 70 },
  { key: "Rule Compliance", value: 78 },
  { key: "Team Play", value: 64 },
  { key: "Transfer (Apply)", value: 58 },
];

const DAYS_ORDER = ["월", "화", "수", "목", "금", "토", "일"];
