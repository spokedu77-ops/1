# SPOKEDU 청담 글 재편집 — 별도 프리뷰

## 먼저 디자인 확인
- `EDITORIAL_DESIGN_PREVIEW.html`을 브라우저에서 열어 글의 메시지·간격·사진배치·CTA를 먼저 확인합니다.
- 목업의 CSS는 **네이버 편집기의 실제 서식과 동일하다고 보장하지 않습니다**. 네이버 입력 전 승인용입니다.
- `article/ARTICLE_FOR_NAVER.md`는 새로 쓴 **편집 후보 원고**입니다. 기존 25블록 글을 덮어쓰지 않았습니다.

## 기존 성공 자동화의 새 후보 검증
```powershell
Set-Location "C:\Users\joker\Documents\GitHub\1\scripts\naver-blog-p0\rich-paste\cheongdam-editorial-redesign"
node --test .\*.test.mjs
node .\run.mjs --offline
```
- `--preview-full`은 기존 Chrome CDP 9222의 새 글쓰기 탭에 사진 4장(현장 3 + 상담 그래픽 1)을 업로드합니다. **사용자 최종 승인 전에 실행하지 마세요.** 저장·발행은 하지 않습니다.
- 네이버에서 링크가 자동 하이퍼링크로 바뀌는지는 이 패키지로 아직 실증되지 않았습니다.
- 사진 속 아동 얼굴은 별도 초상권 공개 동의 확인이 필요합니다.

## 작업의 범위
- 수업 원문: `2026-03-05 청담 다함께키움센터 활동일지` (Google Drive file ID: 17jT0GCpk5kV0v3GxOnO-kc-m6AeDARMO)
- 새 메시지 구조: 협동 → 난도 차이 → 스포츠맨십 → 기관 문의
- 날짜·참여인원·실제 활동·반응은 원문 기록을 우선함. 수치 성과와 아이들 대화를 창작하지 않음.
- 로컬 LLM 작성본 아님. **향후 신규 글에서는 로컬 Gemma 원고를 먼저 읽어야 함.**
