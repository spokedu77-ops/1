/**
 * 과외 안내 랜딩 페이지 설정
 */
export const KAKAO_CHANNEL_URL = 'https://pf.kakao.com/_XXXXXX/chat';

/** 공공기관·프리미엄 브랜드 검증 완료 사업명 (구체적 사업명으로 운영 시 수정) */
export const PARTNERS = [
  '2023년 서울 OO구청 주관 아동 체육 프로그램 운영 연계',
  'OO구 보건소 아동 신체 발달 관리 체육 파견',
  'OO호텔 키즈 웰니스 프로그램 파트너십',
] as const;

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
