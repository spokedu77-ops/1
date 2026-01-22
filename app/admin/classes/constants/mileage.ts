import { MileageAction } from '../types';

export const MILEAGE_ACTIONS: MileageAction[] = [
  { label: '보고 지연', val: -2500 },
  { label: '피드백 누락', val: -2500 },
  { label: '수업 연기', val: 2500 },
  { label: '당일 연기', val: 5000 },
  { label: '주간 베스트 수업안', val: 4000 },
  { label: '주간 베스트 포토', val: 2000 },
  { label: '주간 베스트 피드백', val: 2000 },
];
