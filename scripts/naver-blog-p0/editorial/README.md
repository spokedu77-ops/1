# SPOKEDU NAVER editorial — 실사진 검증형 수업 블로그 레이아웃

실제 FINAL 원고를 수정하지 않고 **19개 블록·3개 소제목을 검증**한 뒤 데스크톱·모바일 공용 HTML 편집 미리보기를 생성합니다.
사진이 확인되지 않으면 명시적으로 `PHOTO SLOT`으로 표기하며, 실제 게시물인 것처럼 가짜 사진·가짜 캡션을 만들어 넣지 않습니다.

## 시작 (기존 프로젝트 루트에서)

```powershell
node scripts/naver-blog-p0/editorial/build-editorial-preview.mjs --article-id=9fad3d9e6f847f36
```

결과: `reports/naver-new/editorial/9fad3d9e6f847f36/editorial-preview.html` 및 `editorial-report.json`.

이 코드는 네이버·Playwright를 호출하지 않으며 이미지 변환 API 요청도 없습니다. 저장·발행·이미지 업로드는 하지 않습니다.

## 실사진 추가

사진을 개인 로컬 폴더에 보관한 뒤 `photos.example.json`을 복사해 photos 배열을 작성합니다. 각 사진에는 다음 값이 필요합니다.

```json
{
  "slot": "cover",
  "sourceFile": "C:\\Users\\joker\\Pictures\\verified-mokwon-class.jpg",
  "sourceName": "현장 사진 원본 파일명",
  "sessionMatchEvidence": "2025년 해당 수업의 회차 및 교사가 확인한 출처",
  "useRightsApproved": "approved",
  "portraitRightsCleared": "approved",
  "activityMatchReviewed": "approved",
  "alt": "사진에 실제로 보이는 활동",
  "caption": "수업 사실과 일치하는 짧은 캡션"
}
```

`node scripts/naver-blog-p0/editorial/build-editorial-preview.mjs --article-id=... --photos=C:\\...\\photos.json`

- 사용 승인 3개 조건 중 하나라도 불충족하면 사진을 배치하지 않습니다.
- 사진은 최대 8개, 원본당 12MB로 제한합니다. 사본만 `reports`에 생성하고 원본은 건드리지 않습니다.
- **레퍼런스 재현 범위:** 커버, 2열 사진, 캡션, 브랜드 서체 위계, 구분선, 모바일 적응형 구조.
- **아직 구현되지 않은 범위:** 네이버 Smart Editor 사진 실제 업로드·그룹 묶기·링크 카드 실기능. HTML 미리보기 자체를 네이버에 통째로 붙여넣으면 CSS가 보존되지 않을 수 있습니다.
- 이미 PASS인 Rich Paste v6 본문 입력 기능은 별개로 보존합니다. 업로드 통합은 승인된 사진 확보 후 검증합니다.

## 선택적 디자인

`--photos=...` JSON에는 `highlightIndices: [18]` (원문 블록의 시각적 강조, 중복 텍스트 없음)와 `relatedLinks: [{"title":"실제 확인된 연관 글 제목","url":"https://...","reviewed":true}]`를 추가할 수 있습니다. 관련 글 주소를 검증하지 못하면 비워 둡니다.

실사 배치 준비 전에는 `designReadyForNaver=false`가 정상입니다. 이는 엔진 오류가 아니라 사진 자료 승인 대기입니다.
