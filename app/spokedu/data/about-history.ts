/** 간단 소개서 — 연혁 「걸어온 길」 (PDF p.4) */

export type AboutHistoryMilestone = {
  date: string;
  text: string;
  highlight?: boolean;
};

export type AboutHistoryPeriod = {
  id: string;
  label: string;
  milestones: AboutHistoryMilestone[];
};

export const aboutHistory = {
  id: 'history',
  eyebrow: '연혁',
  title: '걸어온 길',
  lead: '2020년 설립 이후 현장 수업·기관 파트너십·프로그램 확장의 주요 이력입니다.',
  periods: [
    {
      id: 'founding-2023',
      label: '설립 ~ 2023',
      milestones: [
        { date: '2020. 06', text: '스포키듀 설립 및 출강 시작' },
        { date: '2022. 09', text: '키움센터 거점 3호 주관 수업 (22회기)' },
        { date: '2022. 12', text: '키움센터 거점 5호 주관 수업 (15회기) · 미니운동회' },
        { date: '2023. 02', text: 'KBS 「슈퍼맨이 돌아왔다」 자문 출연', highlight: true },
        { date: '2023. 03', text: '송례초등학교 놀이 체육 수업' },
        { date: '2023. 05', text: '연세 서울로 심리상담센터 MOU · 정서체육 개설', highlight: true },
        { date: '2023. 06', text: '서초 육아지원(외부강사 수업료 지원) 수업 진행' },
        { date: '2023. 07~', text: '반얀트리 호텔 키즈클럽 여름 특강' },
        { date: '2023. 07', text: '키움센터 거점 3호 주관 수업 (12회기)' },
        { date: '2023. 08', text: '강동구 다문화센터 미니 올림픽' },
        { date: '2023. 09~12', text: '양천공원 책 쉼터 수업 · 가족 미니 체육 운동회' },
        { date: '2023. 10~12', text: '서초여성가족플라자 아동체육 인큐베이팅 강의', highlight: true },
        { date: '2023. 11~', text: '키움 거점 돌봄 체육 · 성장 데이터 분석·자문' },
        { date: '2023. 12~', text: '롯데백화점 강남점 문화센터 출강' },
      ],
    },
    {
      id: '2024',
      label: '2024',
      milestones: [
        { date: '2024. 01~02', text: '스포키듀 겨울 성장캠프', highlight: true },
        { date: '2024. 03', text: '푸른숲속 아동청소년 발달센터 MOU', highlight: true },
        { date: '2024. 04', text: '마미랜드 키즈카페 정기 파견', highlight: true },
        { date: '2024. 05', text: '서대문구 청소년 축제 체육 부스 기획·진행' },
        { date: '2024. 05~10', text: '서대문농아인복지관 정서체육 수업' },
        { date: '2024. 06', text: '킹즈캠빗 체스 동아리 MOU', highlight: true },
        { date: '2024. 07', text: '남성초 미니 운동회(사당 청소년문화의집 주관)' },
        { date: '2024. 07', text: '스포키듀 여름 데일리 성장캠프', highlight: true },
        { date: '2024. 07', text: '하이브리드 체육 활동 — 체스' },
        { date: '2024. 07', text: '반얀트리 호텔 키즈클럽 여름 캠프' },
        { date: '2024. 08', text: '키움센터 거점 2호 밸런스 기능 향상 수업' },
        { date: '2024. 09', text: '키움센터 거점 2호 · 초등 늘봄 체육 담당' },
        { date: '2024. 09', text: '리앤비 체형교정센터 MOU', highlight: true },
        { date: '2024. 10', text: '용산 청소년센터 체력측정 클래스' },
        { date: '2024. 11', text: '강동구 가족센터 가족 미니 운동회' },
        { date: '2024. 12', text: '스포키듀 데일리 겨울 캠프(체스&스포츠)', highlight: true },
      ],
    },
    {
      id: '2025',
      label: '2025 ~',
      milestones: [
        { date: '2025. 01', text: '자이언트 체스 수업 오픈(하이브리드 체육)' },
        { date: '2025. 01', text: '시립 은평 청소년센터 겨울 스포츠캠프' },
        { date: '2025. 02', text: '강동구 보건소 가족 미니 운동회', highlight: true },
        { date: '2025. 02', text: '거점형 키움센터 연간 체육 프로그램 계약', highlight: true },
        { date: '2025. 03', text: '이마트 문화센터 미니올림픽 특강(서울·경기·대전)', highlight: true },
        { date: '2025. 04~', text: '한국소아암협회 쉼터 출강', highlight: true },
        { date: '2025. 05', text: '서대문구청 어린이날 행사 체육 부스' },
        { date: '2025. 05', text: '송파구 보건소 청소년 PT 정기 수업', highlight: true },
        { date: '2025. 06', text: '신월2동 지역사회 체육대회' },
        { date: '2025. 07', text: '플레이즈라운지 키즈카페 여름캠프' },
        { date: '2025. 07', text: '반얀트리 호텔 키즈클럽 여름 캠프', highlight: true },
        { date: '2025. 07~08', text: '강동구청 주관 초등 여름방학 늘봄 체육', highlight: true },
        { date: '2025. 07~08', text: '금천구청 주관 초등 여름방학 체육 특강', highlight: true },
        { date: '2025. 08', text: 'SNS 채널 운영 재개(팔로워 약 3만)', highlight: true },
        { date: '2025. 08~', text: '목동 키즈런스포츠파크 유소년 클래스 오픈', highlight: true },
        { date: '2025. 09', text: '이마트 챔피언더블랙벨트 클래스 특강' },
        { date: '2025. 09', text: '서초구 가족센터 엄마와 자녀 체육 특강' },
      ],
    },
  ] satisfies AboutHistoryPeriod[],
} as const;
