# SPOKEDU 이미지 운영 가이드

아래 경로에 실제 수업 사진을 넣으면 `app/spokedu/data/content.ts`의 `spokeduImageManifest`와 자동으로 연결됩니다.

## 폴더 구조

- `/images/home`
- `/images/private`
- `/images/dispatch`
- `/images/curriculum`
- `/images/programs`
- `/images/records`
- `/images/cases`
- `/images/monthly`

## 권장 파일명 목록

### Home
- `home/home-hero-class.jpg` (대표 수업 장면)
- `home/home-lab-scene.jpg` (스포키듀 LAB)
- `home/home-dispatch-scene.jpg` (기관 수업 장면)

### Private
- `private/private-one-to-one.jpg` (1:1 수업)
- `private/private-small-group.jpg` (소그룹 수업)
- `private/private-tool-activity.jpg` (교구 활용 장면)

### Dispatch
- `dispatch/dispatch-group-class.jpg` (기관 단체 수업)
- `dispatch/dispatch-kiwoom-center.jpg` (키움센터 수업)
- `dispatch/dispatch-one-day-event.jpg` (원데이 행사)

### Curriculum
- `curriculum/curriculum-lesson-plan.jpg` (수업안)
- `curriculum/curriculum-tool-setup.jpg` (교구 세팅)
- `curriculum/curriculum-instructor-training.jpg` (강사 교육)
- `curriculum/curriculum-program-materials.jpg` (프로그램 자료)

### Programs
- `programs/program-spomove.jpg` (SPOMOVE)
- `programs/program-paps.jpg` (PAPS)
- `programs/program-play-class.jpg` (놀이체육)
- `programs/program-one-day.jpg` (원데이)
- `programs/program-camp.jpg` (캠프)
- `programs/program-curriculum-content.jpg` (커리큘럼 콘텐츠)

### Records (사례 대표 사진)
- `records/record-lab.jpg`
- `records/record-yangcheon.jpg`
- `records/record-dongjak.jpg`
- `records/record-dasarang.jpg`
- `records/record-playz.jpg`
- `records/record-seodaemun.jpg`

### Cases / Monthly
- `cases/cases-hero.jpg`
- `cases/cases-representative.jpg`
- `monthly/monthly-hero.jpg`
- `monthly/monthly-representative.jpg`

## 운영 규칙

- 파일명을 바꾸지 않고 이미지만 교체하면 코드 수정 없이 반영됩니다.
- 이미지가 없거나 경로가 잘못되면 UI는 자동으로 플레이스홀더로 fallback 됩니다.
