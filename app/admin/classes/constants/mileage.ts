import { MileageAction } from '../types';

export const MILEAGE_ACTIONS: MileageAction[] = [
  { label: '보고 누락', val: -1000 },
  { label: '피드백 누락', val: -1000 },
  { label: '연기 요청', val: -5000 },
  { label: '당일 요청', val: -15000 },
  { label: '수업 연기', val: 2500 },
  { label: '당일 연기', val: 5000 },
];
