/**
 * 과외 안내 랜딩 페이지 설정
 */
export const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_VGWxeb/chat';
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '';

/** 실시간 카운팅 시뮬레이션: 기준일 (YYYY-MM-DD) */
export const COUNTER_BASE_DATE = '2024-01-01';
/** 기준일 시점 누적 학생 수 */
export const COUNTER_BASE_STUDENTS = 1200;
/** 기준일 시점 누적 수업 수 */
export const COUNTER_BASE_SESSIONS = 8500;
/** 일별 증가 학생 수 */
export const COUNTER_DAILY_STUDENTS = 3;
/** 일별 증가 수업 수 */
export const COUNTER_DAILY_SESSIONS = 5;
