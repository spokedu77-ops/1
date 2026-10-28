import { getFieldRecordCatalogItem } from './field-records-catalog';
import { SPOKEDU_IMAGES } from './images';

/** `public/info/dispatch.html` 프로그램 라인업과 동일 CDN (로컬 레지스트리와 병행) */
export const EDUCATION_V0_DISPATCH_POSTIMG = {
  spomove: 'https://i.postimg.cc/8CCvkfs1/seupomubeu.jpg',
  monthlyNewsports: 'https://i.postimg.cc/VvXrZjZF/wolganseupocheu.jpg',
  slowSports: 'https://i.postimg.cc/X73p7BD2/Kakao-Talk-20260407-164353816.jpg',
  miniOlympics: 'https://i.postimg.cc/J0pswpW4/20260417-115503.png',
  sportsBooth: 'https://i.postimg.cc/ZKk6Pqs3/IMG-7940.jpg',
} as const;

const maedong = getFieldRecordCatalogItem('maedong-sports-stepup');
const donghaeng = getFieldRecordCatalogItem('donghaeng-special-pe');
const dongjak = getFieldRecordCatalogItem('dongjak-spomove');

export const EDUCATION_V0_HERO_IMAGE = SPOKEDU_IMAGES.home.fieldEditorialCaseGeneral.src;

export const EDUCATION_V0_PROGRAMS = [
  {
    number: '01',
    title: '스포무브 SPOMOVE',
    subtitle: '시지각 브레인 놀이체육',
    target: '방과후 · 키움센터',
    description: '보고, 판단하고, 움직이는 과정을 하나의 놀이로 연결합니다.',
    tags: ['두뇌체육', '시지각', '놀이 중심'],
    image: EDUCATION_V0_DISPATCH_POSTIMG.spomove,
  },
  {
    number: '02',
    title: '월간 뉴스포츠',
    subtitle: '매달 바뀌는 종목 체험',
    target: '초·중·고 · 지역아동센터',
    description: '매월 새로운 종목을 만나며 운동의 즐거움과 자신감을 키웁니다.',
    tags: ['월간 운영', '종목 체험', '신체활동'],
    image: EDUCATION_V0_DISPATCH_POSTIMG.monthlyNewsports,
  },
  {
    number: '03',
    title: '슬로우 스포츠',
    subtitle: '속도에 맞춘 특수·포용 체육',
    target: '복지관 · 발달센터 · 특수학급',
    description: '아이마다 다른 속도와 감각을 존중하는 포용형 수업입니다.',
    tags: ['개별 맞춤', '포용 체육', '느린 학습자'],
    image: EDUCATION_V0_DISPATCH_POSTIMG.slowSports,
  },
  {
    number: '04',
    title: '미니 올림픽',
    subtitle: '협동과 참여 중심 스페셜 데이',
    target: '유치원 · 학교 · 가족행사',
    description: '경쟁보다 함께하는 과정에 집중하는 기억에 남는 하루를 만듭니다.',
    tags: ['스페셜 데이', '협동', '이벤트'],
    image: EDUCATION_V0_DISPATCH_POSTIMG.miniOlympics,
  },
  {
    number: '05',
    title: '체험형 스포츠 부스',
    subtitle: '순환형 스포츠 체험존',
    target: '학교축제 · 박람회 · 기관행사',
    description: '많은 인원이 짧은 시간에도 몰입할 수 있는 순환형 체험존입니다.',
    tags: ['부스 운영', '순환 동선', '대규모'],
    image: EDUCATION_V0_DISPATCH_POSTIMG.sportsBooth,
  },
  {
    number: '06',
    title: '기관 커스터마이징',
    subtitle: 'PAPS·방학캠프·테마 특강',
    target: '전 기관 맞춤 설계',
    description: '기관의 목표와 일정에 맞춰 가장 필요한 형태로 새롭게 설계합니다.',
    tags: ['PAPS', '방학 캠프', '테마 특강'],
    image: SPOKEDU_IMAGES.programs.camp.src,
  },
] as const;

export const EDUCATION_V0_FIELD_RECORDS = [
  {
    title: maedong.venue,
    description: '학교 · 정기수업: 학년과 인원에 맞춰 종목을 순환하며 연속적인 스포츠 수업 운영',
    image: maedong.thumbnailSrc!,
  },
  {
    title: '서울 중구 찾아가는 동행 체육교실',
    description: '특수 · 통합: 참여자의 수행 수준에 따라 거리, 속도, 규칙 조정',
    image: donghaeng.thumbnailSrc!,
  },
  {
    title: dongjak.venue,
    description: '기관 · SPOMOVE: 화면 자극과 실제 움직임을 연결한 시지각 체육',
    image: dongjak.thumbnailSrc!,
  },
] as const;
